/**
 * Lampa plugin: "Залишок часу +"
 * Оверлей у плеєрі: скільки залишилось (із секундами) і о котрій закінчиться відео.
 * Показується, коли штатна панель плеєра сховалась.
 * ES5 — для старих Tizen/webOS.
 */
(function () {
    'use strict';

    if (window.plugin_time_left_plus) return;
    window.plugin_time_left_plus = true;

    var COMPONENT = 'time_left_plus';

    var el = null;
    var last_text = '';
    var player_open = false;
    var osd_visible = false;
    var last_event = null;
    var timer = null;

    /* ---------- локалізація ---------- */

    var T = {
        uk: {
            title: 'Залишок часу',
            enabled: 'Показувати залишок часу у плеєрі',
            enabled_d: 'Окремий напис, що не залежить від панелі плеєра',
            pos: 'Розташування',
            size: 'Розмір тексту',
            opacity: 'Прозорість фону',
            format: 'Формат',
            seconds: 'Показувати секунди',
            seconds_d: 'Залишок тікає щосекунди разом із відео',
            hide_osd: 'Ховати, коли видно панель плеєра',
            hide_osd_d: 'Щоб не дублювати напис, поки відкрите меню',
            speed: 'Враховувати швидкість відтворення',
            speed_d: 'Час закінчення рахується з урахуванням 1.5x, 2x тощо',
            p_tl: 'Вгорі ліворуч', p_tr: 'Вгорі праворуч', p_bl: 'Внизу ліворуч', p_br: 'Внизу праворуч',
            s_s: 'Малий', s_m: 'Середній', s_l: 'Великий', s_xl: 'Дуже великий',
            o_0: 'Без фону', o_1: 'Прозорий', o_2: 'Помірний', o_3: 'Темний',
            f_two: 'Два рядки: залишок і кінець',
            f_line: 'Один рядок: залишок · кінець',
            f_end: 'Тільки час закінчення',
            f_full: 'Як в меню: 01:34:17 - Залишилось 1 г. 34 х.',
            f_exact: 'Точно: -01:34:09',
            left: 'Залишилось',
            ends: 'Кінець о'
        },
        ru: {
            title: 'Остаток времени',
            enabled: 'Показывать остаток времени в плеере',
            enabled_d: 'Отдельная надпись, не зависящая от панели плеера',
            pos: 'Расположение',
            size: 'Размер текста',
            opacity: 'Прозрачность фона',
            format: 'Формат',
            seconds: 'Показывать секунды',
            seconds_d: 'Остаток тикает каждую секунду вместе с видео',
            hide_osd: 'Скрывать, когда видна панель плеера',
            hide_osd_d: 'Чтобы не дублировать надпись, пока открыто меню',
            speed: 'Учитывать скорость воспроизведения',
            speed_d: 'Время окончания считается с учётом 1.5x, 2x и т.д.',
            p_tl: 'Сверху слева', p_tr: 'Сверху справа', p_bl: 'Снизу слева', p_br: 'Снизу справа',
            s_s: 'Малый', s_m: 'Средний', s_l: 'Большой', s_xl: 'Очень большой',
            o_0: 'Без фона', o_1: 'Прозрачный', o_2: 'Умеренный', o_3: 'Тёмный',
            f_two: 'Две строки: остаток и конец',
            f_line: 'Одна строка: остаток · конец',
            f_end: 'Только время окончания',
            f_full: 'Как в меню: 01:34:17 - Осталось 1 ч. 34 м.',
            f_exact: 'Точно: -01:34:09',
            left: 'Осталось',
            ends: 'Конец в'
        },
        en: {
            title: 'Time remaining',
            enabled: 'Show remaining time in player',
            enabled_d: 'Separate label that does not depend on the player panel',
            pos: 'Position',
            size: 'Text size',
            opacity: 'Background opacity',
            format: 'Format',
            seconds: 'Show seconds',
            seconds_d: 'Remaining time ticks every second along with the video',
            hide_osd: 'Hide while the player panel is visible',
            hide_osd_d: 'Avoids duplicating the label while the menu is open',
            speed: 'Account for playback speed',
            speed_d: 'End time is calculated for 1.5x, 2x, etc.',
            p_tl: 'Top left', p_tr: 'Top right', p_bl: 'Bottom left', p_br: 'Bottom right',
            s_s: 'Small', s_m: 'Medium', s_l: 'Large', s_xl: 'Extra large',
            o_0: 'No background', o_1: 'Transparent', o_2: 'Medium', o_3: 'Dark',
            f_two: 'Two lines: remaining and end',
            f_line: 'One line: remaining · end',
            f_end: 'End time only',
            f_full: 'Like the panel: 01:34:17 - Left 1 h 34 m',
            f_exact: 'Exact: -01:34:09',
            left: 'Left',
            ends: 'Ends at'
        }
    };

    function tr(key) {
        var lang = 'ru';
        try { lang = Lampa.Storage.get('language', 'ru'); } catch (e) {}
        var pack = T[lang] || (lang === 'be' ? T.ru : T.en);
        return pack[key] || T.en[key] || key;
    }

    /* ---------- налаштування ---------- */

    function opt(name, def) {
        try {
            var v = Lampa.Storage.get(name, def);
            return (v === undefined || v === null || v === '') ? def : v;
        } catch (e) {
            return def;
        }
    }

    function flag(name, def) {
        var v = opt(name, def);
        return v === true || v === 'true';
    }

    function isEnabled() { return flag('tlp_enabled', true); }

    /* ---------- час ---------- */

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function clock(ms) {
        var d = new Date(ms);
        return pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    // 56:12 або 1:34:09
    function countdown(sec) {
        var s = Math.max(0, Math.ceil(sec));
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        var r = s % 60;

        return h > 0 ? h + ':' + pad(m) + ':' + pad(r) : pad(m) + ':' + pad(r);
    }

    function leftText(left) {
        if (flag('tlp_seconds', true)) return tr('left') + ' ' + countdown(left);

        return (Lampa.Lang.translate('title_left') + ' ' + Lampa.Utils.secondsToTimeHuman(left)).replace(/\s+$/, '');
    }

    function playbackRate() {
        if (!flag('tlp_speed', true)) return 1;
        try {
            var v = document.querySelector('video');
            var r = v && v.playbackRate;
            return (r > 0 && isFinite(r)) ? r : 1;
        } catch (e) {
            return 1;
        }
    }

    function format(duration, current) {
        var left = Math.max(0, duration - current);
        var mode = String(opt('tlp_format', 'two'));

        if (mode === 'exact') return '-' + Lampa.Utils.secondsToTime(left);

        if (mode === 'full') return Lampa.Utils.secondsToTime(duration) + ' - ' + leftText(left);

        var end = tr('ends') + ' ' + clock(Date.now() + (left / playbackRate()) * 1000);

        if (mode === 'end') return end;
        if (mode === 'line') return leftText(left) + ' \u00B7 ' + end;

        return leftText(left) + '\n' + end; // two
    }

    /* ---------- DOM ---------- */

    function create() {
        if (el) return el;

        el = document.createElement('div');
        el.className = 'time-left-plus';
        el.style.cssText = [
            'position:fixed',
            'z-index:150',
            'pointer-events:none',
            'display:none',
            'padding:0.3em 0.8em',
            'border-radius:0.6em',
            'color:#fff',
            'font-weight:500',
            'line-height:1.35',
            'white-space:pre',
            'font-variant-numeric:tabular-nums',
            'text-shadow:0 0 0.3em rgba(0,0,0,0.9)'
        ].join(';');

        document.body.appendChild(el);
        applyStyle();

        return el;
    }

    function applyStyle() {
        if (!el) return;

        var pos = String(opt('tlp_pos', 'br'));
        var size = parseFloat(opt('tlp_size', '1.3')) || 1.3;
        var bg = parseFloat(opt('tlp_opacity', '0.55'));
        if (isNaN(bg)) bg = 0.55;

        el.style.top = el.style.bottom = el.style.left = el.style.right = 'auto';

        if (pos.charAt(0) === 't') el.style.top = '2.5vh';
        else el.style.bottom = '2.5vh';

        if (pos.charAt(1) === 'l') {
            el.style.left = '2.5vw';
            el.style.textAlign = 'left';
        } else {
            el.style.right = '2.5vw';
            el.style.textAlign = 'right';
        }

        el.style.fontSize = size + 'em';
        el.style.background = 'rgba(0,0,0,' + bg + ')';
    }

    function setVisible(status) {
        if (!el) return;

        var show = Boolean(status) && isEnabled() && !(flag('tlp_hide_osd', true) && osd_visible);

        el.style.display = show ? 'block' : 'none';
    }

    function setText(text) {
        if (!el || text === last_text) return;

        last_text = text;
        el.textContent = text;
    }

    /* ---------- логіка ---------- */

    function playdata() {
        try { return Lampa.Player.playdata() || {}; } catch (e) { return {}; }
    }

    function update(e) {
        if (!player_open || !e) return;

        last_event = e;

        var duration = e.duration;
        var current = e.current;

        // Лайв / IPTV / невідома тривалість
        if (!isFinite(duration) || !(duration > 0) || playdata().iptv) {
            setVisible(false);
            return;
        }

        create();

        setText(format(duration, current || 0));
        setVisible(true);
    }

    function refresh() {
        applyStyle();
        last_text = '';

        if (last_event) update(last_event);
        else setVisible(false);
    }

    function startTimer() {
        stopTimer();
        // На паузі timeupdate не приходить, а час закінчення йде вперед
        timer = setInterval(function () {
            if (last_event) update(last_event);
        }, 1000);
    }

    function stopTimer() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    function onStart() {
        player_open = true;
        osd_visible = false;
        last_event = null;
        last_text = '';

        if (el) el.style.display = 'none';

        startTimer();
    }

    function onDestroy() {
        player_open = false;
        osd_visible = false;
        last_event = null;
        last_text = '';

        stopTimer();

        if (el) {
            el.style.display = 'none';
            el.textContent = '';
        }
    }

    /* ---------- налаштування Lampa ---------- */

    function addSettings() {
        try {
            Lampa.SettingsApi.addComponent({
                component: COMPONENT,
                name: tr('title'),
                icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l3 2M9 2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: 'tlp_enabled', type: 'trigger', default: true },
                field: { name: tr('enabled'), description: tr('enabled_d') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {
                    name: 'tlp_format',
                    type: 'select',
                    values: { two: tr('f_two'), line: tr('f_line'), end: tr('f_end'), full: tr('f_full'), exact: tr('f_exact') },
                    default: 'two'
                },
                field: { name: tr('format') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: 'tlp_seconds', type: 'trigger', default: true },
                field: { name: tr('seconds'), description: tr('seconds_d') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {
                    name: 'tlp_pos',
                    type: 'select',
                    values: { tl: tr('p_tl'), tr: tr('p_tr'), bl: tr('p_bl'), br: tr('p_br') },
                    default: 'br'
                },
                field: { name: tr('pos') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {
                    name: 'tlp_size',
                    type: 'select',
                    values: { '1': tr('s_s'), '1.3': tr('s_m'), '1.7': tr('s_l'), '2.2': tr('s_xl') },
                    default: '1.3'
                },
                field: { name: tr('size') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {
                    name: 'tlp_opacity',
                    type: 'select',
                    values: { '0': tr('o_0'), '0.3': tr('o_1'), '0.55': tr('o_2'), '0.8': tr('o_3') },
                    default: '0.55'
                },
                field: { name: tr('opacity') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: 'tlp_hide_osd', type: 'trigger', default: true },
                field: { name: tr('hide_osd'), description: tr('hide_osd_d') },
                onChange: refresh
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: { name: 'tlp_speed', type: 'trigger', default: true },
                field: { name: tr('speed'), description: tr('speed_d') },
                onChange: refresh
            });
        } catch (e) {
            console.log('TimeLeftPlus', 'settings error:', e && e.message);
        }
    }

    /* ---------- запуск ---------- */

    function init() {
        addSettings();

        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);

        Lampa.PlayerVideo.listener.follow('timeupdate', update);

        try {
            Lampa.PlayerPanel.listener.follow('visible', function (e) {
                osd_visible = Boolean(e && e.status);

                if (last_event) update(last_event);
            });
        } catch (e) {}

        try {
            if (Lampa.Player.opened()) {
                player_open = true;
                startTimer();
            }
        } catch (e) {}

        console.log('TimeLeftPlus', 'ready');
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
