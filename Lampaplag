(function () {
  'use strict';

  if (window.time_left_plugin) return;
  window.time_left_plugin = true;

  var box = null;
  var duration = 0;
  var current = 0;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function applyStyle() {
    if (!box) return;
    var pos = Lampa.Storage.get('tl_position', 'tr');
    var size = Lampa.Storage.get('tl_size', '1.3');
    var opacity = Lampa.Storage.get('tl_opacity', '0.8');

    box.style.cssText =
      'position:fixed;z-index:9999;padding:0.4em 0.8em;border-radius:0.5em;' +
      'background:rgba(0,0,0,' + opacity + ');color:#fff;' +
      'font-size:' + size + 'em;line-height:1.3;pointer-events:none;';

    if (pos.indexOf('t') === 0) box.style.top = '1.5em'; else box.style.bottom = '1.5em';
    if (pos.indexOf('r') > 0) box.style.right = '1.5em'; else box.style.left = '1.5em';
  }

  function render() {
    if (!box || !duration) return;
    var left = Math.max(0, duration - current);
    var minutes = Math.ceil(left / 60);
    var end = new Date(Date.now() + left * 1000);
    box.innerHTML =
      'Залишилось: ' + minutes + ' хв<br>Кінець о ' + pad(end.getHours()) + ':' + pad(end.getMinutes());
  }

  function panelVisible() {
    var panel = document.querySelector('.player-panel');
    return panel && !panel.classList.contains('hide') && panel.offsetParent !== null;
  }

  function updateVisibility() {
    if (!box) return;
    box.style.display = (Lampa.Storage.get('tl_enabled', true) && !panelVisible()) ? 'block' : 'none';
  }

  function start() {
    if (box) return;
    box = document.createElement('div');
    document.body.appendChild(box);
    applyStyle();
    render();
    updateVisibility();
  }

  function stop() {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null;
    duration = 0;
    current = 0;
  }

  Lampa.Player.listener.follow('ready', start);
  Lampa.Player.listener.follow('destroy', stop);

  Lampa.PlayerVideo.listener.follow('timeupdate', function (e) {
    current = e.current || 0;
    duration = e.duration || duration;
    render();
    updateVisibility();
  });

  Lampa.PlayerVideo.listener.follow('durationchange', function (e) {
    duration = e.duration || duration;
  });

  // Налаштування
  Lampa.SettingsApi.addComponent({
    component: 'time_left',
    name: 'Час до кінця відео',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 11h-5V7h2v4h3v2z"/></svg>'
  });

  Lampa.SettingsApi.addParam({
    component: 'time_left',
    param: { name: 'tl_enabled', type: 'trigger', default: true },
    field: { name: 'Показувати оверлей' },
    onChange: function () { applyStyle(); updateVisibility(); }
  });

  Lampa.SettingsApi.addParam({
    component: 'time_left',
    param: {
      name: 'tl_position', type: 'select', default: 'tr',
      values: { tl: 'Зверху зліва', tr: 'Зверху справа', bl: 'Знизу зліва', br: 'Знизу справа' }
    },
    field: { name: 'Положення' },
    onChange: applyStyle
  });

  Lampa.SettingsApi.addParam({
    component: 'time_left',
    param: {
      name: 'tl_size', type: 'select', default: '1.3',
      values: { '1': 'Малий', '1.3': 'Середній', '1.7': 'Великий', '2.2': 'Дуже великий' }
    },
    field: { name: 'Розмір тексту' },
    onChange: applyStyle
  });

  Lampa.SettingsApi.addParam({
    component: 'time_left',
    param: {
      name: 'tl_opacity', type: 'select', default: '0.8',
      values: { '0.4': 'Дуже прозорий', '0.6': 'Прозорий', '0.8': 'Помірний', '1': 'Непрозорий' }
    },
    field: { name: 'Прозорість фону' },
    onChange: applyStyle
  });
})();
