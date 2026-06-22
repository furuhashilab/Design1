/* global maplibregl, STORY */

const DWELL_MS = 6000;      // 自動再生中の各シーン滞在時間
const FLY_MS   = 3200;      // シーン間カメラ移動時間
const ORBIT_DEG = 22;       // 滞在中の自動回転角度

let map;
let currentIndex = -1;
let autoPlaying = false;
let orbitRAF = null;
let autoTimer = null;
let activePopup = null;

function buildRail(){
  const rail = document.getElementById('rail');
  STORY.forEach((s, i) => {
    if (i > 0) {
      const line = document.createElement('div');
      line.className = 'rail-line';
      rail.appendChild(line);
    }
    const wrap = document.createElement('button');
    wrap.className = 'rail-dot-wrap';
    wrap.id = 'rail-' + i;
    wrap.setAttribute('aria-label', s.year + '年 ' + s.place);
    wrap.addEventListener('click', () => {
      stopAutoplay();
      goToScene(i);
    });
    const year = document.createElement('div');
    year.className = 'rail-year';
    year.textContent = s.year;
    const dot = document.createElement('div');
    dot.className = 'rail-dot';
    wrap.appendChild(year);
    wrap.appendChild(dot);
    rail.appendChild(wrap);
  });
}

function updateRail(idx){
  STORY.forEach((_, i) => {
    const el = document.getElementById('rail-' + i);
    el.classList.toggle('active', i === idx);
    el.classList.toggle('passed', i < idx);
  });
}

function initMap(){
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: STORY[0].center,
    zoom: 14,
    pitch: 60,
    bearing: 0,
    antialias: true,
    attributionControl: true
  });

  map.on('load', () => {
    add3DBuildings();
    addMarkers();
  });
}

function add3DBuildings(){
  const layers = map.getStyle().layers;
  const labelLayerId = layers.find(
    (l) => l.type === 'symbol' && l.layout && l.layout['text-field']
  )?.id;

  if (!map.getLayer('wc-3d-buildings')) {
    map.addLayer(
      {
        id: 'wc-3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['get', 'render_height'],
            0, '#1b2740',
            40, '#2c3a5c',
            120, '#3c4e78'
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.88
        }
      },
      labelLayerId
    );
  }

  if (map.setFog) {
    try {
      map.setFog({ range: [0.6, 9], color: '#16223a', 'horizon-blend': 0.25 });
    } catch (e) { /* style may not support fog */ }
  }
}

function addMarkers(){
  STORY.forEach((s) => {
    const el = document.createElement('div');
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.borderRadius = '50%';
    el.style.background = '#bc002d';
    el.style.boxShadow = '0 0 0 4px rgba(188,0,45,0.25), 0 0 14px rgba(188,0,45,0.9)';
    new maplibregl.Marker({ element: el }).setLngLat(s.center).addTo(map);
  });
}

function showPopup(s){
  if (activePopup) activePopup.remove();
  activePopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 18,
    anchor: 'bottom'
  })
    .setLngLat(s.center)
    .setHTML(
      `<span class="popup-year">${s.year}</span>${s.place}・日本 ${s.score} ${s.opponent}`
    )
    .addTo(map);
}

function orbitDuring(ms, fromBearing){
  const start = performance.now();
  cancelAnimationFrame(orbitRAF);
  function step(now){
    const t = Math.min(1, (now - start) / ms);
    map.setBearing(fromBearing + ORBIT_DEG * t);
    if (t < 1) orbitRAF = requestAnimationFrame(step);
  }
  orbitRAF = requestAnimationFrame(step);
}

function runProgressBar(totalMs){
  const fill = document.getElementById('progress-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  if (!totalMs) return;
  requestAnimationFrame(() => {
    fill.style.transition = `width ${totalMs}ms linear`;
    fill.style.width = '100%';
  });
}

function goToScene(idx){
  if (idx < 0 || idx >= STORY.length) return;
  currentIndex = idx;
  const s = STORY[idx];

  updateRail(idx);
  document.getElementById('hud-counter').textContent =
    String(idx + 1).padStart(2, '0') + ' / ' + String(STORY.length).padStart(2, '0');
  document.getElementById('prev-btn').disabled = idx === 0;
  document.getElementById('next-btn').disabled = idx === STORY.length - 1;
  document.getElementById('replay-btn').classList.remove('show');

  const card = document.getElementById('story-card');
  card.classList.remove('show');
  cancelAnimationFrame(orbitRAF);

  map.flyTo({
    center: s.center,
    zoom: s.zoom,
    pitch: s.pitch,
    bearing: s.bearing,
    duration: FLY_MS,
    curve: 1.3,
    essential: true
  });

  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    document.getElementById('card-num-text').textContent = s.num;
    document.getElementById('card-year').textContent = s.year + '年';
    document.getElementById('card-place').innerHTML =
      s.place + ' <span class="country">' + s.country + '</span>';
    document.getElementById('card-match').textContent =
      '日本 ' + s.score + ' ' + s.opponent;
    document.getElementById('card-date').textContent = s.date;
    document.getElementById('card-title').textContent = s.title;
    document.getElementById('card-body').textContent = s.body;
    card.classList.add('show');

    showPopup(s);            // 到着時に自動でポップアップ表示
    orbitDuring(8000, s.bearing); // 滞在中は自動でゆっくり回転し続ける

    if (autoPlaying) {
      runProgressBar(DWELL_MS);
      autoTimer = setTimeout(() => {
        if (idx + 1 < STORY.length) {
          goToScene(idx + 1);
        } else {
          stopAutoplay();
          document.getElementById('replay-btn').classList.add('show');
        }
      }, DWELL_MS);
    } else {
      runProgressBar(0);
    }
  }, FLY_MS);
}

function startAutoplay(){
  autoPlaying = true;
  document.getElementById('play-btn').textContent = '⏸ 一時停止';
  if (currentIndex < 0 || currentIndex === STORY.length - 1) {
    goToScene(0);
  } else {
    goToScene(currentIndex); // 現在シーンから再開
  }
}

function stopAutoplay(){
  autoPlaying = false;
  document.getElementById('play-btn').textContent = '▶ 自動再生';
  clearTimeout(autoTimer);
  document.getElementById('progress-fill').style.transition = 'none';
}

function toggleAutoplay(){
  if (autoPlaying) {
    stopAutoplay();
  } else {
    startAutoplay();
  }
}

function startStory(){
  document.getElementById('title-screen').classList.add('hidden');
  goToScene(0);
}

function restartStory(){
  document.getElementById('replay-btn').classList.remove('show');
  document.getElementById('story-card').classList.remove('show');
  goToScene(0);
}

window.addEventListener('DOMContentLoaded', () => {
  buildRail();
  initMap();

  document.getElementById('start-btn').addEventListener('click', startStory);
  document.getElementById('replay-btn').addEventListener('click', restartStory);

  document.getElementById('prev-btn').addEventListener('click', () => {
    stopAutoplay();
    goToScene(currentIndex - 1);
  });
  document.getElementById('next-btn').addEventListener('click', () => {
    stopAutoplay();
    goToScene(currentIndex + 1);
  });
  document.getElementById('play-btn').addEventListener('click', toggleAutoplay);

  // キーボード操作（左右キーで手動切り替え）
  window.addEventListener('keydown', (e) => {
    if (document.getElementById('title-screen').classList.contains('hidden') === false) return;
    if (e.key === 'ArrowRight') { stopAutoplay(); goToScene(currentIndex + 1); }
    if (e.key === 'ArrowLeft')  { stopAutoplay(); goToScene(currentIndex - 1); }
  });
});
