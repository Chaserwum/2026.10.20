// ===== 多模式學習遊戲：選單 + 連連看 + 拼拼圖 + 多媒體測驗 =====
// 整份程式只用一張畫布。用變數 mode 記住現在在哪個畫面：
//   "menu"（選單）、"match"（連連看）、"puzzle"（拼拼圖）、"quiz"（多媒體測驗）
// 每個模式都是 MODES 裡的一組函式：
//   enter()  進入模式時執行（重設狀態）
//   resize() 視窗大小改變時重新排版
//   draw(t)  每一幀畫畫面，t 是秒數
//   down() / move() / up()  按下、移動、放開（滑鼠與觸控都會進來）

// ==================================================================
// 共用：模式表與切換
// ==================================================================

const FONT = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif';

const MODES = {
  menu:   { enter: menuEnter, resize: menuLayout, draw: menuDraw, down: menuDown, move: noop, up: menuUp },
  match:  { enter: matchNewGame, resize: matchLayout, draw: matchDraw, down: matchDown, move: matchMove, up: matchUp },
  puzzle: { enter: puzzleEnter, resize: puzzleLayout, draw: puzzleDraw, down: puzzleDown, move: puzzleMove, up: puzzleUp },
  quiz:   placeholderMode("多媒體測驗", "看圖、聽聲音，回答選擇題"),
};

let mode = "menu";
let cursorType = "default";
let backBtn = { x: 10, y: 10, w: 84, h: 34, label: "← 選單" };
let imgs = {};      // gif 圖片

function noop() {}

function goMode(name) {
  mode = name;
  MODES[mode].enter();
  layoutAll();
}

function layoutAll() {
  const small = width < 700;
  backBtn = { x: 10, y: 10, w: small ? 68 : 84, h: small ? 30 : 34, label: "← 選單" };
  MODES[mode].resize();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(FONT);
  textAlign(CENTER, CENTER);
  for (const it of ITEMS) {
    if (it.gif) imgs[it.name] = loadImage(it.gif);
  }
  puzzleLoadImages();
  goMode("menu");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutAll();
}

// 每一幀重畫
function draw() {
  background(244, 246, 250);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  cursorType = "default";

  MODES[mode].draw(millis() / 1000);

  if (mode !== "menu") drawBackButton();
  cursor(cursorType);
}

function drawBackButton() {
  const b = backBtn;
  const over = inRect(mouseX, mouseY, b.x, b.y, b.w, b.h);
  if (over) cursorType = "pointer";
  noStroke();
  fill(over ? color(210, 218, 232) : color(225, 230, 240));
  rect(b.x, b.y, b.w, b.h, b.h / 2);
  fill(60, 70, 90);
  textAlign(CENTER, CENTER);
  textSize(b.h * 0.42);
  text(b.label, b.x + b.w / 2, b.y + b.h / 2);
}

// 滑鼠與觸控都會進到這三個事件，再交給目前的模式
function mousePressed() {
  if (!inCanvas()) return;
  if (mode !== "menu" && inRect(mouseX, mouseY, backBtn.x, backBtn.y, backBtn.w, backBtn.h)) {
    goMode("menu");
    return false;
  }
  MODES[mode].down();
  return false;
}
function mouseDragged() { MODES[mode].move(); return false; }
function mouseReleased() { MODES[mode].up(); }

// ---------- 共用工具 ----------
function inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function inCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function drawButton(b, c) {
  const over = inRect(mouseX, mouseY, b.x, b.y, b.w, b.h);
  if (over) cursorType = "pointer";
  const dy = over ? -1 : 0;
  noStroke();
  fill(red(c), green(c), blue(c), over ? 255 : 225);
  rect(b.x, b.y + dy, b.w, b.h, b.h / 2);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(b.h * 0.38);
  textStyle(BOLD);
  text(b.label, b.x + b.w / 2, b.y + b.h / 2 + dy);
  textStyle(NORMAL);
}

// ==================================================================
// 模式 0：選單
// ==================================================================
const MENU = [
  { key: "match",  title: "動態連連看", desc: "把名稱拖到對應的動畫上", color: [46, 125, 230], icon: iconMatch },
  { key: "puzzle", title: "拼拼圖遊戲", desc: "把碎片拼回完整圖片",     color: [240, 140, 40], icon: iconPuzzle },
  { key: "quiz",   title: "多媒體測驗", desc: "看圖、聽聲音答選擇題",   color: [40, 170, 120], icon: iconQuiz },
];

let menuCards = [];     // 每張卡片的位置：{ x, y, w, h }
let menuStack = false;  // 窄螢幕時改成直向排列
let menuHeadH = 130;
let menuHover = [0, 0, 0];
let menuPress = -1;

function menuEnter() {
  menuPress = -1;
  menuHover = [0, 0, 0];
}

function menuLayout() {
  const n = MENU.length;
  menuStack = width < 700;
  menuHeadH = width < 500 ? 100 : 130;
  menuCards = [];

  if (menuStack) {
    const gap = 12;
    const w = min(width - 32, 440);
    const h = constrain((height - menuHeadH - 20 - (n - 1) * gap) / n, 80, 150);
    const x = (width - w) / 2;
    for (let i = 0; i < n; i++) {
      menuCards.push({ x, y: menuHeadH + i * (h + gap), w, h });
    }
  } else {
    const gap = 24;
    const w = min((width - 40 - (n - 1) * gap) / n, 300);
    const availH = height - menuHeadH - 20;
    const h = max(140, min(availH, w * 1.15));
    const x0 = (width - (n * w + (n - 1) * gap)) / 2;
    const y = menuHeadH + max(0, (availH - h) / 2);
    for (let i = 0; i < n; i++) {
      menuCards.push({ x: x0 + i * (w + gap), y, w, h });
    }
  }
}

function menuDraw() {
  noStroke();
  fill(40, 50, 70);
  textSize(width < 500 ? 24 : 34);
  textStyle(BOLD);
  text("選擇遊戲模式", width / 2, menuHeadH * 0.4);
  textStyle(NORMAL);
  textSize(width < 500 ? 13 : 16);
  fill(110, 120, 140);
  text("點一下卡片就開始", width / 2, menuHeadH * 0.72);

  for (let i = 0; i < MENU.length; i++) drawMenuCard(i);
}

function drawMenuCard(i) {
  const c = menuCards[i];
  const m = MENU[i];
  if (!c) return;
  const over = inRect(mouseX, mouseY, c.x, c.y, c.w, c.h);
  if (over) cursorType = "pointer";
  menuHover[i] = lerp(menuHover[i], over ? 1 : 0, 0.2);
  const y = c.y - menuHover[i] * 6;
  const [r, g, b] = m.color;

  // 卡片本體
  noStroke();
  fill(0, 0, 0, 18 + menuHover[i] * 14);
  rect(c.x + 3, y + 6, c.w, c.h, 18);
  fill(255);
  rect(c.x, y, c.w, c.h, 18);
  fill(r, g, b);
  rect(c.x, y + c.h - 6, c.w, 6, 0, 0, 18, 18);

  if (menuStack) {
    // 直向排列：圖示在左，文字在右
    const d = c.h * 0.62;
    const icx = c.x + c.h * 0.52;
    const icy = y + (c.h - 6) / 2;
    fill(r, g, b);
    circle(icx, icy, d);
    m.icon(icx, icy, d * 0.62);

    textAlign(LEFT, CENTER);
    fill(40, 50, 70);
    textStyle(BOLD);
    textSize(constrain(c.h * 0.2, 18, 26));
    text(m.title, c.x + c.h + 6, y + c.h * 0.36);
    textStyle(NORMAL);
    fill(110, 120, 140);
    textSize(constrain(c.h * 0.13, 12, 15));
    text(m.desc, c.x + c.h + 6, y + c.h * 0.64);
    textAlign(CENTER, CENTER);
  } else {
    // 橫向排列：圖示在上，文字在下
    const d = min(c.w * 0.42, c.h * 0.42);
    const icx = c.x + c.w / 2;
    const icy = y + c.h * 0.34;
    fill(r, g, b);
    circle(icx, icy, d);
    m.icon(icx, icy, d * 0.62);

    fill(40, 50, 70);
    textStyle(BOLD);
    textSize(constrain(c.w * 0.09, 16, 26));
    text(m.title, c.x + c.w / 2, y + c.h * 0.68);
    textStyle(NORMAL);
    fill(110, 120, 140);
    textSize(constrain(c.w * 0.052, 11, 15));
    text(m.desc, c.x + c.w / 2, y + c.h * 0.83);
  }
}

function menuCardAt(px, py) {
  for (let i = 0; i < menuCards.length; i++) {
    const c = menuCards[i];
    if (inRect(px, py, c.x, c.y, c.w, c.h)) return i;
  }
  return -1;
}

function menuDown() {
  menuPress = menuCardAt(mouseX, mouseY);
}

function menuUp() {
  const i = menuCardAt(mouseX, mouseY);
  const press = menuPress;
  menuPress = -1;
  if (press >= 0 && i === press) goMode(MENU[i].key);
}

// 選單圖示：以 (cx, cy) 為中心，大小約 s
function iconMatch(cx, cy, s) {
  noStroke();
  fill(255);
  const w = s * 0.38, h = s * 0.28, rr = s * 0.06;
  rect(cx - s * 0.6, cy - s * 0.42, w, h, rr);
  rect(cx - s * 0.6, cy + s * 0.14, w, h, rr);
  rect(cx + s * 0.22, cy - s * 0.42, w, h, rr);
  rect(cx + s * 0.22, cy + s * 0.14, w, h, rr);
  stroke(255);
  strokeWeight(max(2, s * 0.05));
  strokeCap(ROUND);
  line(cx - s * 0.2, cy - s * 0.28, cx + s * 0.2, cy + s * 0.28);
  line(cx - s * 0.2, cy + s * 0.28, cx + s * 0.2, cy - s * 0.28);
}

function iconPuzzle(cx, cy, s) {
  noStroke();
  fill(255);
  const q = s * 0.4, g = s * 0.04, rr = s * 0.06;
  const wob = sin(millis() / 350) * s * 0.05;
  rect(cx - q - g, cy - q - g, q, q, rr);
  rect(cx + g, cy - q - g, q, q, rr);
  rect(cx - q - g, cy + g, q, q, rr);
  fill(255, 255, 255, 215);
  rect(cx + g + wob, cy + g + wob, q, q, rr);
  fill(255);
  circle(cx, cy - q / 2 - g, s * 0.14);
  circle(cx - q / 2 - g, cy, s * 0.14);
}

function iconQuiz(cx, cy, s) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(s * 1.1);
  text("?", cx, cy - s * 0.04);
  textStyle(NORMAL);
}

// ==================================================================
// 尚未完成的模式（拼拼圖、多媒體測驗）的暫時畫面
// 之後把 MODES.puzzle / MODES.quiz 換成你自己的 enter、resize、draw、down、move、up 即可
// ==================================================================
function placeholderMode(title, hint) {
  return {
    enter: noop,
    resize: noop,
    down: noop,
    move: noop,
    up: noop,
    draw() {
      noStroke();
      fill(40, 50, 70);
      textSize(width < 500 ? 20 : 26);
      textStyle(BOLD);
      text(title, width / 2, 28);
      textStyle(NORMAL);

      fill(110, 120, 140);
      textSize(width < 500 ? 14 : 18);
      text(hint, width / 2, height / 2 - 18);
      fill(160, 170, 190);
      textSize(width < 500 ? 12 : 14);
      text("這個模式還沒做，按左上角回選單", width / 2, height / 2 + 14);
    },
  };
}

// ==================================================================
// 模式 2：拼拼圖遊戲（建築）
// ==================================================================

// ① 題目與圖片放在最上面
// 圖片：把你的建築照片放進專案的 images 資料夾，再照格式加在這裡。
// 有放照片就只用照片（每次隨機挑一張，不會連續重複）；
// 沒放或找不到檔案，就改用程式畫的 3 張建築圖。
const PUZZLE_IMAGES = [
  // { title: "巴黎艾菲爾鐵塔", src: "images/eiffel.jpg" },
  // { title: "羅馬競技場",     src: "images/colosseum.jpg" },
];

// 題目：每塊拼圖一題（共 9 題，每次遊戲隨機分配到不同拼圖）
// q 是題目，opts 是選項，ans 是正確答案在 opts 裡的位置（從 0 開始）
const PUZZLE_QS = [
  { q: "艾菲爾鐵塔位於哪一個國家？", opts: ["法國", "義大利", "英國"], ans: 0 },
  { q: "羅馬競技場位於哪一個城市？", opts: ["雅典", "羅馬", "巴黎"], ans: 1 },
  { q: "台北 101 位於台北市的哪一區？", opts: ["信義區", "中山區", "大安區"], ans: 0 },
  { q: "泰姬瑪哈陵位於哪一個國家？", opts: ["伊朗", "土耳其", "印度"], ans: 2 },
  { q: "雪梨歌劇院位於哪一個國家？", opts: ["澳洲", "美國", "加拿大"], ans: 0 },
  { q: "帕德嫩神殿位於哪一個城市？", opts: ["伊斯坦堡", "雅典", "開羅"], ans: 1 },
  { q: "哥德式教堂常見的結構特色是什麼？", opts: ["圓形穹頂與厚牆", "尖拱與飛扶壁", "平屋頂與方柱"], ans: 1 },
  { q: "萬里長城最主要的用途是什麼？", opts: ["防禦外敵", "灌溉農田", "祭祀祖先"], ans: 0 },
  { q: "故宮（紫禁城）位於哪一個城市？", opts: ["上海", "西安", "北京"], ans: 2 },
];

const PZ_BUILTIN = [
  { title: "城市天際線", draw: sceneSkyline },
  { title: "希臘神殿", draw: sceneTemple },
  { title: "日式寶塔", draw: scenePagoda },
];

const PZ_PITCH = 1.4;   // 拼圖托盤裡每塊的間距（單位：拼圖邊長）

// 用變數記住狀態
// 每塊拼圖有三種狀態：locked（鎖住）→ open（可拖曳）→ placed（拼好）
let pzPieces = [];
let pzEdgesH = [];      // 橫向邊的方向值：1 凸、-1 凹、0 平邊
let pzEdgesV = [];      // 直向邊的方向值
let pzG = null;         // 這局用的方形圖片
let pzTitle = "", pzLastTitle = "";

let pzS = 100;          // 一塊拼圖的邊長
let pzBX = 0, pzBY = 0; // 拼圖板左上角
let pzTX = 0, pzTY = 0, pzTW = 0; // 托盤左上角與邊長
let pzHeadH = 80;

let pzDrag = -1, pzPress = -1, pzMoved = false;
let pzOffX = 0, pzOffY = 0, pzPX = 0, pzPY = 0;

let pzAsk = -1;         // 正在回答哪一塊（-1 表示沒有）
let pzPhase = 0;        // 0 選答案，1 看結果
let pzChoice = -1;
let pzOpts = [];

let pzFinished = false, pzFinishAt = 0;
let pzBtnReset = { x: 0, y: 0, w: 0, h: 0, label: "重新開始" };
let pzBtnAgain = { x: 0, y: 0, w: 0, h: 0, label: "再玩一次" };

function puzzleLoadImages() {
  for (const it of PUZZLE_IMAGES) {
    if (!it.src) continue;
    loadImage(
      it.src,
      (im) => { it.img = im; },
      () => console.warn("找不到圖片：" + it.src)
    );
  }
}

function puzzleEnter() {
  // 選圖：優先用你放的照片，不連續選到同一張
  const loaded = PUZZLE_IMAGES.filter((x) => x.img);
  const pool = loaded.length > 0 ? loaded : PZ_BUILTIN;
  let choices = pool.filter((x) => x.title !== pzLastTitle);
  if (choices.length === 0) choices = pool;
  const pick = random(choices);
  pzLastTitle = pick.title;
  pzTitle = pick.title;

  if (pzG) pzG.remove();
  pzG = createGraphics(600, 600);
  pzG.pixelDensity(1);
  if (pick.img) {
    const im = pick.img;
    const side = min(im.width, im.height);
    pzG.image(im, 0, 0, 600, 600, (im.width - side) / 2, (im.height - side) / 2, side, side);
  } else {
    pick.draw(pzG);
  }

  // ① 凸起與凹槽：相鄰兩塊共用同一條邊，一塊凸、另一塊就凹
  pzEdgesH = [];
  for (let r = 0; r <= 3; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) row.push(r === 0 || r === 3 ? 0 : random() < 0.5 ? 1 : -1);
    pzEdgesH.push(row);
  }
  pzEdgesV = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    for (let c = 0; c <= 3; c++) row.push(c === 0 || c === 3 ? 0 : random() < 0.5 ? 1 : -1);
    pzEdgesV.push(row);
  }

  // 題目與托盤位置都隨機分配
  const qOrder = shuffle(PUZZLE_QS.map((_, i) => i));
  const slotOrder = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  pzPieces = [];
  for (let i = 0; i < 9; i++) {
    pzPieces.push({
      row: floor(i / 3),
      col: i % 3,
      q: PUZZLE_QS[qOrder[i % qOrder.length]],
      slot: slotOrder[i],
      state: "locked",
      result: null,      // true 答對、false 答錯、null 還沒答
      x: 0, y: 0, gx: 0, gy: 0,
      path: null,
    });
  }

  pzDrag = -1;
  pzPress = -1;
  pzMoved = false;
  pzAsk = -1;
  pzPhase = 0;
  pzChoice = -1;
  pzFinished = false;
  puzzleLayout();
  for (const p of pzPieces) {
    p.x = p.gx;
    p.y = p.gy;
  }
}

function puzzleLayout() {
  const m = 12, g = 18;
  pzHeadH = width < 500 ? 62 : 80;

  // 橫排（拼圖板在左、托盤在右）與直排（板在上、托盤在下），選能放得比較大的
  const sL = min((width - 2 * m - g) / (3 + 3 * PZ_PITCH), (height - pzHeadH - m) / (3 * PZ_PITCH));
  const sP = min((width - 2 * m) / (3 * PZ_PITCH), (height - pzHeadH - m - g) / (3 + 3 * PZ_PITCH));
  const land = sL >= sP;
  pzS = max(30, land ? sL : sP);
  const s = pzS;
  pzTW = 3 * PZ_PITCH * s;

  if (land) {
    const total = 3 * s + g + pzTW;
    pzBX = (width - total) / 2;
    pzTY = pzHeadH + max(0, (height - pzHeadH - m - pzTW) / 2);
    pzBY = pzTY + (pzTW - 3 * s) / 2;
    pzTX = pzBX + 3 * s + g;
  } else {
    pzBX = (width - 3 * s) / 2;
    pzBY = pzHeadH;
    pzTX = (width - pzTW) / 2;
    pzTY = pzBY + 3 * s + g;
  }

  const small = width < 700;
  const bw = small ? 84 : 100;
  const bh = small ? 30 : 34;
  pzBtnReset = { x: width - 10 - bw, y: 10, w: bw, h: bh, label: "重新開始" };
  pzBtnAgain = { x: pzTX + pzTW / 2 - 60, y: pzTY + pzTW - 12 - 40, w: 120, h: 40, label: "再玩一次" };

  for (const p of pzPieces) {
    p.path = pzMakePath(p.row, p.col, s);
    const t = p.state === "placed" ? pzTarget(p) : pzHome(p);
    p.gx = t.x;
    p.gy = t.y;
    p.x = p.gx;
    p.y = p.gy;
  }
}

function pzTarget(p) {
  return { x: pzBX + p.col * pzS, y: pzBY + p.row * pzS };
}

function pzHome(p) {
  const r = floor(p.slot / 3);
  const c = p.slot % 3;
  const pad = ((PZ_PITCH - 1) * pzS) / 2;
  return { x: pzTX + c * PZ_PITCH * pzS + pad, y: pzTY + r * PZ_PITCH * pzS + pad };
}

// 拼圖的形狀：四條邊依序接起來，凸起用兩段貝茲曲線 bezierCurveTo() 畫
function pzMakePath(r, c, s) {
  const path = new Path2D();
  const top = -pzEdgesH[r][c];
  const right = pzEdgesV[r][c + 1];
  const bottom = pzEdgesH[r + 1][c];
  const left = -pzEdgesV[r][c];
  path.moveTo(0, 0);
  pzEdge(path, 0, 0, s, 0, 0, -1, top);
  pzEdge(path, s, 0, s, s, 1, 0, right);
  pzEdge(path, s, s, 0, s, 0, 1, bottom);
  pzEdge(path, 0, s, 0, 0, -1, 0, left);
  path.closePath();
  return path;
}

// 從 (x0,y0) 畫到 (x1,y1)；(nx,ny) 是向外的方向；d：1 往外凸、-1 往內凹、0 平邊
function pzEdge(path, x0, y0, x1, y1, nx, ny, d) {
  if (d === 0) {
    path.lineTo(x1, y1);
    return;
  }
  const L = dist(x0, y0, x1, y1);
  const ux = (x1 - x0) / L;
  const uy = (y1 - y0) / L;
  // a：沿著邊的位置（0 到 1），b：凸出去的高度
  const P = (a, b) => [x0 + ux * a * L + nx * d * b * L, y0 + uy * a * L + ny * d * b * L];
  let q = P(0.38, 0);
  path.lineTo(q[0], q[1]);
  let c1 = P(0.26, 0.08);
  let c2 = P(0.3, 0.27);
  let e = P(0.5, 0.25);
  path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
  c1 = P(0.7, 0.27);
  c2 = P(0.74, 0.08);
  e = P(0.62, 0);
  path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
  path.lineTo(x1, y1);
}

// ② 判斷一：點到哪一塊，用拼圖的真實形狀判斷
function pzHit(p, mx, my) {
  const ctx = drawingContext;
  const d = pixelDensity();
  ctx.save();
  ctx.setTransform(d, 0, 0, d, p.x * d, p.y * d);
  const inside = ctx.isPointInPath(p.path, mx * d, my * d);
  ctx.restore();
  return inside;
}

function pzPieceAt(mx, my) {
  for (let i = pzPieces.length - 1; i >= 0; i--) {
    const p = pzPieces[i];
    if (p.state === "placed") continue;
    if (pzHit(p, mx, my)) return i;
  }
  return -1;
}

function pzScore() {
  return pzPieces.filter((p) => p.result === true).length;
}

function puzzleDraw() {
  const s = pzS;
  const ctx = drawingContext;

  // 每塊慢慢滑向它的目標位置（拖曳中的除外）
  pzPieces.forEach((p, i) => {
    if (i === pzDrag && pzMoved) return;
    p.x += (p.gx - p.x) * 0.3;
    p.y += (p.gy - p.y) * 0.3;
    if (abs(p.gx - p.x) < 0.3 && abs(p.gy - p.y) < 0.3) {
      p.x = p.gx;
      p.y = p.gy;
    }
  });

  // 標題與進度
  const unlocked = pzPieces.filter((p) => p.state !== "locked").length;
  const placedN = pzPieces.filter((p) => p.state === "placed").length;
  noStroke();
  fill(40, 50, 70);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(width < 500 ? 20 : 26);
  text("建築拼圖挑戰", width / 2, pzHeadH * 0.34);
  textStyle(NORMAL);
  textSize(width < 500 ? 12 : 14);
  fill(110, 120, 140);
  let sub;
  if (pzFinished) sub = "完成！圖片：" + pzTitle;
  else if (unlocked === 0) sub = "點一塊拼圖答題解鎖，再拖到拼圖板";
  else sub = "已解鎖 " + unlocked + " / 9　已拼好 " + placedN + " / 9　答對 " + pzScore();
  text(sub, width / 2, pzHeadH * 0.68);

  // 拼圖板：白底、淡淡的底圖、還沒拼好的格子輪廓
  noStroke();
  fill(255);
  rect(pzBX - 6, pzBY - 6, 3 * s + 12, 3 * s + 12, 10);
  if (!pzFinished) {
    push();
    tint(255, 60);
    image(pzG, pzBX, pzBY, 3 * s, 3 * s);
    pop();
  }
  for (const p of pzPieces) {
    if (p.state === "placed") continue;
    const t = pzTarget(p);
    push();
    translate(t.x, t.y);
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(110,120,140,0.45)";
    ctx.stroke(p.path);
    ctx.restore();
    pop();
  }

  // 拼好的拼圖
  pzPieces.forEach((p) => {
    if (p.state === "placed") pzDrawPiece(p, false);
  });

  // 全部拼好：完整圖畫淡入
  if (pzFinished) {
    const a = constrain((millis() - pzFinishAt) / 700, 0, 1);
    push();
    tint(255, a * 255);
    image(pzG, pzBX, pzBY, 3 * s, 3 * s);
    pop();
  }

  // 托盤或成績
  if (pzFinished) {
    pzDrawResult();
  } else {
    noStroke();
    fill(225, 230, 240);
    rect(pzTX, pzTY, pzTW, pzTW, 14);
    pzPieces.forEach((p, i) => {
      if (p.state !== "placed" && !(i === pzDrag && pzMoved)) pzDrawPiece(p, false);
    });
    if (pzDrag >= 0 && pzMoved) pzDrawPiece(pzPieces[pzDrag], true);
  }

  drawButton(pzBtnReset, color(120, 130, 150));

  if (pzAsk < 0) {
    if (pzDrag >= 0 && pzMoved) cursorType = "grabbing";
    else if (!pzFinished && pzPieceAt(mouseX, mouseY) >= 0) cursorType = "pointer";
  }

  if (pzAsk >= 0) pzDrawModal();
}

function pzDrawPiece(p, lifted) {
  const s = pzS;
  const ctx = drawingContext;
  push();
  translate(p.x, p.y);
  ctx.save();
  if (lifted) {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
  }
  if (p.state === "locked") {
    ctx.fillStyle = "#9aa8c2";
    ctx.fill(p.path);
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke(p.path);
    ctx.restore();
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(s * 0.42);
    text("?", s / 2, s / 2 + 2);
    textStyle(NORMAL);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fill(p.path);
    ctx.shadowColor = "transparent";
    ctx.save();
    ctx.clip(p.path);
    image(pzG, -p.col * s, -p.row * s, 3 * s, 3 * s);
    ctx.restore();
    ctx.lineWidth = p.state === "placed" ? 1 : 2;
    ctx.strokeStyle = p.state === "placed" ? "rgba(255,255,255,0.45)" : "rgba(40,50,70,0.5)";
    ctx.stroke(p.path);
    ctx.restore();
  }
  pop();
}

function pzDrawResult() {
  const w = pzTW;
  const x = pzTX;
  const y = pzTY;
  noStroke();
  fill(225, 230, 240);
  rect(x, y, w, w, 14);

  textAlign(CENTER, CENTER);
  fill(40, 50, 70);
  textStyle(BOLD);
  textSize(constrain(w * 0.07, 16, 24));
  text("成績九宮格", x + w / 2, y + w * 0.07);

  const gap = 6;
  const gridTop = y + w * 0.13;
  const budget = w - w * 0.13 - 34 - 52 - 12;
  const cs = max(20, min(w * 0.2, (budget - 2 * gap) / 3));
  const gridW = 3 * cs + 2 * gap;
  const gx = x + (w - gridW) / 2;
  for (const p of pzPieces) {
    const cx = gx + p.col * (cs + gap);
    const cy = gridTop + p.row * (cs + gap);
    noStroke();
    fill(p.result === true ? color(40, 170, 90) : p.result === false ? color(230, 80, 70) : color(160, 170, 190));
    rect(cx, cy, cs, cs, 10);
    fill(255);
    textSize(cs * 0.5);
    text(p.result === true ? "✓" : p.result === false ? "✗" : "-", cx + cs / 2, cy + cs / 2 + 1);
  }

  const k = pzScore();
  fill(k === 9 ? color(30, 150, 80) : color(40, 50, 70));
  textSize(constrain(w * 0.06, 16, 22));
  text(k === 9 ? "全對！答對 9 / 9 🎉" : "答對 " + k + " / 9", x + w / 2, gridTop + gridW + 22);
  textStyle(NORMAL);

  drawButton(pzBtnAgain, color(46, 125, 230));
}

// ---------- 題目視窗 ----------
function pzOpenAsk(i) {
  pzAsk = i;
  pzPhase = 0;
  pzChoice = -1;
  const q = pzPieces[i].q;
  pzOpts = shuffle(q.opts.map((txt, k) => ({ text: txt, correct: k === q.ans })));
}

// 中文沒有空格，所以自己一個字一個字量寬度來換行
function pzWrap(str, maxW) {
  const lines = [];
  let cur = "";
  for (const ch of str) {
    if (cur !== "" && textWidth(cur + ch) > maxW) {
      lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function pzModal() {
  const small = width < 500;
  const w = min(width - 24, 520);
  const pad = small ? 14 : 20;
  const qSize = small ? 16 : 19;
  const oSize = small ? 15 : 17;
  const qlh = qSize * 1.45;
  const olh = oSize * 1.4;
  const p = pzPieces[pzAsk];

  textStyle(NORMAL);
  textSize(qSize);
  const qLines = pzWrap(p.q.q, w - 2 * pad);
  textSize(oSize);
  const optLines = pzOpts.map((o) => pzWrap(o.text, w - 2 * pad - 28));
  const optH = optLines.map((l) => max(44, l.length * olh + 16));

  let fbLines = [];
  if (pzPhase === 1) {
    const chosen = pzOpts[pzChoice];
    const right = pzOpts.find((o) => o.correct);
    const msg = chosen.correct
      ? "答對了！拼圖解鎖囉"
      : "答錯了，正確答案是「" + right.text + "」。這題不計分，拼圖一樣解鎖。";
    fbLines = pzWrap(msg, w - 2 * pad);
  }

  const titleH = 24;
  let h = pad + titleH + qLines.length * qlh + 12;
  for (const oh of optH) h += oh + 8;
  if (pzPhase === 1) h += fbLines.length * olh + 10 + 44;
  h += pad;

  const x = (width - w) / 2;
  const y = max(8, (height - h) / 2);
  let cy = y + pad + titleH + qLines.length * qlh + 12;
  const opts = optH.map((oh) => {
    const r = { x: x + pad, y: cy, w: w - 2 * pad, h: oh };
    cy += oh + 8;
    return r;
  });
  const fbY = cy + 2;
  const btn =
    pzPhase === 1
      ? { x: x + pad, y: fbY + fbLines.length * olh + 10, w: w - 2 * pad, h: 44, label: "解鎖拼圖" }
      : null;
  return { x, y, w, h, pad, qSize, oSize, qlh, olh, qLines, optLines, opts, fbLines, fbY, btn };
}

function pzDrawModal() {
  const M = pzModal();
  const p = pzPieces[pzAsk];
  noStroke();
  fill(20, 28, 45, 150);
  rect(0, 0, width, height);
  fill(255);
  rect(M.x, M.y, M.w, M.h, 16);

  textAlign(LEFT, TOP);
  fill(110, 120, 140);
  textSize(13);
  text("第 " + (p.row * 3 + p.col + 1) + " 塊拼圖：選一個答案", M.x + M.pad, M.y + M.pad);

  fill(40, 50, 70);
  textStyle(BOLD);
  textSize(M.qSize);
  const qTop = M.y + M.pad + 24;
  M.qLines.forEach((ln, i) => text(ln, M.x + M.pad, qTop + i * M.qlh));
  textStyle(NORMAL);

  textSize(M.oSize);
  M.opts.forEach((r, k) => {
    const o = pzOpts[k];
    const over = pzPhase === 0 && inRect(mouseX, mouseY, r.x, r.y, r.w, r.h);
    if (over) cursorType = "pointer";
    let bg = over ? color(230, 240, 255) : color(244, 246, 250);
    let bd = color(200, 210, 230);
    if (pzPhase === 1) {
      if (o.correct) {
        bg = color(215, 245, 225);
        bd = color(40, 170, 90);
      } else if (k === pzChoice) {
        bg = color(252, 222, 218);
        bd = color(230, 80, 70);
      }
    }
    fill(bg);
    stroke(bd);
    strokeWeight(2);
    rect(r.x, r.y, r.w, r.h, 10);
    noStroke();
    fill(40, 50, 70);
    const lines = M.optLines[k];
    const top = r.y + (r.h - lines.length * M.olh) / 2;
    lines.forEach((ln, i) => text(ln, r.x + 14, top + i * M.olh));
  });

  if (pzPhase === 1) {
    fill(pzOpts[pzChoice].correct ? color(30, 150, 80) : color(210, 80, 60));
    textSize(M.oSize);
    M.fbLines.forEach((ln, i) => text(ln, M.x + M.pad, M.fbY + i * M.olh));
    drawButton(M.btn, color(46, 125, 230));
  }
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
}

function pzModalDown() {
  const M = pzModal();
  if (pzPhase === 0) {
    for (let k = 0; k < M.opts.length; k++) {
      const r = M.opts[k];
      if (inRect(mouseX, mouseY, r.x, r.y, r.w, r.h)) {
        pzChoice = k;
        pzPieces[pzAsk].result = pzOpts[k].correct;
        pzPhase = 1;
        return;
      }
    }
    // 點視窗外面：先不答題，關掉視窗
    if (!inRect(mouseX, mouseY, M.x, M.y, M.w, M.h)) pzAsk = -1;
  } else if (inRect(mouseX, mouseY, M.btn.x, M.btn.y, M.btn.w, M.btn.h)) {
    pzPieces[pzAsk].state = "open";
    pzAsk = -1;
  }
}

// ---------- 按下、移動、放開 ----------
function puzzleDown() {
  if (pzAsk >= 0) {
    pzModalDown();
    return;
  }
  if (inRect(mouseX, mouseY, pzBtnReset.x, pzBtnReset.y, pzBtnReset.w, pzBtnReset.h)) {
    puzzleEnter();
    return;
  }
  if (pzFinished) {
    if (inRect(mouseX, mouseY, pzBtnAgain.x, pzBtnAgain.y, pzBtnAgain.w, pzBtnAgain.h)) puzzleEnter();
    return;
  }
  const i = pzPieceAt(mouseX, mouseY);
  pzPress = i;
  pzMoved = false;
  pzPX = mouseX;
  pzPY = mouseY;
  if (i >= 0 && pzPieces[i].state === "open") {
    pzDrag = i;
    pzOffX = mouseX - pzPieces[i].x;
    pzOffY = mouseY - pzPieces[i].y;
  }
}

function puzzleMove() {
  if (pzAsk >= 0 || pzDrag < 0) return;
  if (!pzMoved && dist(mouseX, mouseY, pzPX, pzPY) > 6) pzMoved = true;
  if (pzMoved) {
    pzPieces[pzDrag].x = mouseX - pzOffX;
    pzPieces[pzDrag].y = mouseY - pzOffY;
  }
}

function puzzleUp() {
  if (pzAsk >= 0) return;
  if (pzPress >= 0) {
    const p = pzPieces[pzPress];
    if (pzDrag >= 0 && pzMoved) {
      // ② 判斷二：離正確位置夠近就吸附
      const t = pzTarget(p);
      if (dist(p.x, p.y, t.x, t.y) < pzS * 0.35) {
        p.state = "placed";
        p.gx = t.x;
        p.gy = t.y;
        // ② 判斷三：每一塊都放好就完成
        if (pzPieces.every((z) => z.state === "placed")) {
          pzFinished = true;
          pzFinishAt = millis();
        }
      }
      // 沒吸附就滑回托盤（p.gx、p.gy 還是原本托盤的位置）
    } else if (p.state === "locked" && dist(mouseX, mouseY, pzPX, pzPY) <= 8) {
      pzOpenAsk(pzPress);
    }
  }
  pzDrag = -1;
  pzPress = -1;
  pzMoved = false;
}

// ---------- 內建的 3 張建築圖（600 x 600） ----------
function sceneSkyline(g) {
  g.noStroke();
  for (let y = 0; y < 600; y += 2) {
    const k = y / 600;
    g.fill(lerp(70, 255, k), lerp(70, 170, k), lerp(150, 120, k));
    g.rect(0, y, 600, 2);
  }
  g.fill(255, 225, 160, 235);
  g.circle(150, 390, 130);

  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  g.fill(105, 90, 150);
  for (let x = -20; x < 600; x += 62) {
    const h = 150 + rnd() * 170;
    g.rect(x, 600 - h, 56, h);
  }
  let x = 0;
  while (x < 600) {
    const w = 44 + rnd() * 34;
    const h = 190 + rnd() * 190;
    if (x + w > 330 && x < 470) {
      x += w;
      continue;
    }
    g.fill(34, 36, 72);
    g.rect(x, 600 - h, w, h);
    g.fill(255, 214, 110);
    for (let wy = 600 - h + 14; wy < 590; wy += 20) {
      for (let wx = x + 8; wx < x + w - 10; wx += 14) {
        if (rnd() < 0.55) g.rect(wx, wy, 6, 9);
      }
    }
    x += w + 4;
  }
  // 中間的高塔：一節一節往上疊
  for (let i = 0; i < 8; i++) {
    const y = 600 - i * 44;
    g.fill(58, 96, 128);
    g.quad(370, y, 430, y, 438, y - 40, 362, y - 40);
    g.fill(150, 200, 230);
    g.rect(374, y - 26, 52, 6);
  }
  g.fill(58, 96, 128);
  g.triangle(380, 248, 420, 248, 400, 190);
  g.rect(397, 140, 6, 60);
}

function sceneTemple(g) {
  g.noStroke();
  for (let y = 0; y < 600; y += 2) {
    const k = y / 600;
    g.fill(lerp(150, 255, k), lerp(200, 240, k), lerp(240, 210, k));
    g.rect(0, y, 600, 2);
  }
  g.fill(255, 232, 150);
  g.circle(520, 70, 70);
  g.fill(255, 255, 255, 220);
  g.ellipse(120, 90, 130, 36);
  g.ellipse(160, 80, 90, 34);
  g.ellipse(430, 150, 110, 30);

  g.fill(120, 170, 110);
  g.rect(0, 540, 600, 60);
  g.fill(235, 225, 205);
  g.rect(30, 522, 540, 18);
  g.rect(50, 506, 500, 16);
  g.rect(70, 490, 460, 16);

  for (let i = 0; i < 6; i++) {
    const cx = 120 + i * 72;
    g.fill(245, 240, 228);
    g.rect(cx - 17, 250, 34, 240);
    g.rect(cx - 24, 240, 48, 14);
    g.rect(cx - 22, 482, 44, 8);
    g.stroke(214, 204, 184);
    g.strokeWeight(2);
    for (let f = -9; f <= 9; f += 9) g.line(cx + f, 256, cx + f, 482);
    g.noStroke();
  }
  g.fill(236, 228, 210);
  g.rect(90, 205, 420, 36);
  g.fill(244, 238, 224);
  g.triangle(80, 205, 520, 205, 300, 100);
  g.fill(222, 212, 190);
  g.triangle(130, 196, 470, 196, 300, 116);
  g.fill(200, 150, 90);
  g.circle(300, 168, 28);
}

function scenePagoda(g) {
  g.noStroke();
  for (let y = 0; y < 600; y += 2) {
    const k = y / 600;
    g.fill(lerp(30, 240, k), lerp(40, 150, k), lerp(90, 130, k));
    g.rect(0, y, 600, 2);
  }
  g.fill(250, 245, 220);
  g.circle(470, 120, 80);
  g.fill(70, 60, 110);
  g.triangle(-60, 560, 140, 330, 340, 560);
  g.fill(55, 48, 95);
  g.triangle(240, 560, 470, 300, 700, 560);
  g.fill(38, 46, 58);
  g.rect(0, 540, 600, 60);

  for (let i = 0; i < 5; i++) {
    const yb = 530 - i * 88;
    const w = 300 - i * 46;
    g.fill(150, 60, 50);
    g.rect(300 - w * 0.3, yb - 52, w * 0.6, 52);
    g.fill(250, 210, 120);
    g.rect(300 - 9, yb - 40, 18, 28);
    g.fill(52, 44, 58);
    g.quad(300 - w / 2, yb - 52, 300 + w / 2, yb - 52, 300 + w / 2 - 30, yb - 84, 300 - w / 2 + 30, yb - 84);
    g.rect(300 - w / 2 - 8, yb - 56, w + 16, 6);
  }
  g.fill(52, 44, 58);
  g.rect(297, 20, 6, 70);
  g.fill(120, 100, 90);
  g.rect(230, 530, 140, 10);
  g.rect(215, 540, 170, 10);
}

// ==================================================================
// 模式 1：動態連連看
// ==================================================================

// ① 題目放在最上面：換題目只改這個陣列
// name：標籤上的名稱，也是正確答案
// gif ：留空就用程式畫的動畫；填入網址就改用網路 GIF
// anim：內建動畫的函式名稱
const ITEMS = [
  { name: "晴天", en: "Sunny",   gif: "", anim: drawSunny  },
  { name: "多雲", en: "Cloudy",  gif: "", anim: drawCloudy },
  { name: "下雨", en: "Rainy",   gif: "", anim: drawRainy  },
  { name: "下雪", en: "Snowy",   gif: "", anim: drawSnowy  },
  { name: "打雷", en: "Thunder", gif: "", anim: drawThunder },
  { name: "有風", en: "Windy",   gif: "", anim: drawWindy  },
];

// 用變數記住狀態
let slots = [];     // 每一格：{ x, y, item }
let tags = [];      // 每個標籤：{ name, x, y, hx, hy, slot }
let place = [];     // place[格子編號] = 標籤編號（-1 表示空的）

let dragging = -1;  // 按下去的標籤
let moved = false;  // 是否已經算「拖曳」
let offX = 0, offY = 0, pressX = 0, pressY = 0;
let selected = -1;  // 點選（尚未放置）的標籤
let checked = false;

// 版面（由 matchLayout() 依視窗大小算出）
let cardW = 220, cardH = 150, labelH = 48;
let tagW = 120, tagH = 38;
let headH = 84;
let trayY = 0, trayH = 0, trayPerRow = 6;
let resultY = 0;
let btnCheck = { x: 0, y: 0, w: 0, h: 0, label: "檢查答案" };
let btnReset = { x: 0, y: 0, w: 0, h: 0, label: "重新開始" };

function matchNewGame() {
  const order = shuffle(ITEMS.map((_, i) => i));
  slots = order.map((idx) => ({ x: 0, y: 0, item: ITEMS[idx] }));

  const names = shuffle(ITEMS.map((it) => it.name));
  tags = names.map((n) => ({ name: n, x: 0, y: 0, hx: 0, hy: 0, slot: -1 }));

  place = slots.map(() => -1);
  dragging = -1;
  selected = -1;
  moved = false;
  checked = false;
  matchLayout();
}

// 依目前視窗大小，算出所有東西的位置與尺寸
function matchLayout() {
  const n = ITEMS.length;
  const small = width < 700;
  const cols = small ? 2 : 3;
  const rows = ceil(n / cols);
  const m = small ? 12 : 20;
  const gapX = small ? 10 : 24;
  const gapY = small ? 8 : 14;

  headH = width < 500 ? 56 : 84;
  tagH = small ? 32 : 38;
  tagW = small ? 88 : 120;
  labelH = tagH + 10;

  // 底部：按鈕、結果文字、標籤盤（由下往上排）
  const btnH = small ? 38 : 44;
  const btnW = small ? 110 : 140;
  btnCheck = { x: width / 2 - btnW - 8, y: height - m - btnH, w: btnW, h: btnH, label: "檢查答案" };
  btnReset = { x: width / 2 + 8, y: height - m - btnH, w: btnW, h: btnH, label: "重新開始" };
  resultY = btnCheck.y - 16;

  const tgap = 10;
  trayPerRow = max(1, floor((width - 2 * m + tgap) / (tagW + tgap)));
  const trayRows = ceil(n / trayPerRow);
  trayH = trayRows * (tagH + tgap) + tgap;
  trayY = resultY - 16 - trayH;

  // 卡片區：用剩下的空間，等比例縮放
  const availW = width - 2 * m;
  const availH = trayY - 10 - headH;
  let cw = (availW - (cols - 1) * gapX) / cols;
  const chMax = (availH - (rows - 1) * gapY) / rows - labelH;
  cw = min(cw, (chMax * 220) / 150);
  cw = max(cw, 60);
  cardW = cw;
  cardH = (cw * 150) / 220;

  const gridW = cols * cardW + (cols - 1) * gapX;
  const gridH = rows * (cardH + labelH) + (rows - 1) * gapY;
  const gridX = (width - gridW) / 2;
  const gridY = headH + max(0, (availH - gridH) / 2);

  slots.forEach((s, i) => {
    s.x = gridX + (i % cols) * (cardW + gapX);
    s.y = gridY + floor(i / cols) * (cardH + labelH + gapY);
  });

  // 標籤的「家」：標籤盤裡一列一列排，每列置中
  tags.forEach((tg, i) => {
    const row = floor(i / trayPerRow);
    const col = i % trayPerRow;
    const count = min(trayPerRow, n - row * trayPerRow);
    const rowW = count * tagW + (count - 1) * tgap;
    tg.hx = (width - rowW) / 2 + col * (tagW + tgap);
    tg.hy = trayY + tgap + row * (tagH + tgap);
    if (i === dragging && moved) return;
    if (tg.slot >= 0) snap(i);
    else {
      tg.x = tg.hx;
      tg.y = tg.hy;
    }
  });
}

function matchDraw(t) {
  // 標題
  noStroke();
  fill(40, 50, 70);
  textSize(width < 500 ? 20 : 26);
  textStyle(BOLD);
  text("天氣動態連連看", width / 2, headH * 0.36);
  textStyle(NORMAL);
  textSize(width < 500 ? 12 : 14);
  fill(110, 120, 140);
  text("把名稱拖到對應的動畫上，或先點名稱再點卡片", width / 2, headH * 0.68);

  // 卡片
  for (let s = 0; s < slots.length; s++) drawCard(slots[s], s, t);

  // 標籤盤
  noStroke();
  fill(225, 230, 240);
  rect(8, trayY, width - 16, trayH, 14);

  // 標籤（拖曳中的放最上層）
  for (let i = 0; i < tags.length; i++) {
    if (!(i === dragging && moved)) drawTag(i);
  }
  if (dragging >= 0 && moved) drawTag(dragging);

  // 成績或進度
  const placed = place.filter((p) => p >= 0).length;
  noStroke();
  textSize(width < 500 ? 15 : 18);
  textStyle(BOLD);
  if (checked) {
    const k = score();
    fill(k === slots.length ? color(30, 150, 80) : color(210, 80, 60));
    text(
      k === slots.length ? "全部答對！太棒了 🎉" : "答對 " + k + " / " + slots.length + "，再試試看",
      width / 2,
      resultY
    );
  } else {
    fill(110, 120, 140);
    text("已放置 " + placed + " / " + slots.length, width / 2, resultY);
  }
  textStyle(NORMAL);

  // 按鈕
  drawButton(btnCheck, placed === slots.length ? color(46, 125, 230) : color(160, 175, 200));
  drawButton(btnReset, color(120, 130, 150));

  // 游標
  if (dragging >= 0 && moved) cursorType = "grabbing";
  else if (tagAt(mouseX, mouseY) >= 0) cursorType = "pointer";
}

function drawCard(s, si, t) {
  const it = s.item;
  const r = max(6, cardW * 0.04);

  // 卡片陰影
  noStroke();
  fill(0, 0, 0, 25);
  rect(s.x + 3, s.y + 4, cardW, cardH, r);

  // ③ 動畫縮放：把 220x150 的畫縮放成卡片大小
  push();
  drawingContext.save();
  drawingContext.beginPath();
  if (drawingContext.roundRect) drawingContext.roundRect(s.x, s.y, cardW, cardH, r);
  else drawingContext.rect(s.x, s.y, cardW, cardH);
  drawingContext.clip();
  translate(s.x, s.y);
  scale(cardW / 220, cardH / 150);
  if (it.gif && imgs[it.name]) {
    image(imgs[it.name], 0, 0, 220, 150);
  } else {
    it.anim(t);
  }
  drawingContext.restore();
  pop();

  // 邊框
  noFill();
  strokeWeight(3);
  const tagIdx = place[si];
  if (checked && tagIdx >= 0) {
    stroke(tags[tagIdx].name === it.name ? color(40, 170, 90) : color(230, 80, 70));
  } else if (selected >= 0 && tagIdx < 0) {
    stroke(46, 125, 230);
  } else {
    stroke(255);
  }
  rect(s.x, s.y, cardW, cardH, r);

  // 標籤放置區
  noStroke();
  fill(255);
  rect(s.x, s.y + cardH + 6, cardW, labelH - 6, 8);
  if (tagIdx < 0) {
    fill(190, 198, 212);
    textSize(width < 500 ? 11 : 13);
    text("放這裡", s.x + cardW / 2, s.y + cardH + 6 + (labelH - 6) / 2);
  }

  // 對錯圖示
  if (checked && tagIdx >= 0) {
    const ok = tags[tagIdx].name === it.name;
    const d = min(26, cardW * 0.13);
    fill(ok ? color(40, 170, 90) : color(230, 80, 70));
    circle(s.x + cardW - d * 0.7, s.y + d * 0.7, d);
    fill(255);
    textSize(d * 0.62);
    textStyle(BOLD);
    text(ok ? "✓" : "✕", s.x + cardW - d * 0.7, s.y + d * 0.7 + 1);
    textStyle(NORMAL);
  }
}

function drawTag(i) {
  const tg = tags[i];
  const isDrag = i === dragging && moved;
  noStroke();
  if (isDrag) {
    fill(0, 0, 0, 35);
    rect(tg.x + 3, tg.y + 6, tagW, tagH, tagH / 2);
  }
  if (checked && tg.slot >= 0) {
    fill(tg.name === slots[tg.slot].item.name ? color(40, 170, 90) : color(230, 80, 70));
  } else {
    fill(i === selected ? color(46, 125, 230) : color(255, 255, 255));
  }
  stroke(i === selected ? color(46, 125, 230) : color(190, 200, 218));
  strokeWeight(2);
  rect(tg.x, tg.y, tagW, tagH, tagH / 2);

  noStroke();
  const light = i === selected || (checked && tg.slot >= 0);
  fill(light ? 255 : color(40, 50, 70));
  textSize(tagH * 0.46);
  textStyle(BOLD);
  text(tg.name, tg.x + tagW / 2, tg.y + tagH / 2 + 1);
  textStyle(NORMAL);
}

// ② 拖曳的三個事件
// 按下：記住拿起哪一個標籤
function matchDown() {
  if (inRect(mouseX, mouseY, btnCheck.x, btnCheck.y, btnCheck.w, btnCheck.h)) {
    if (place.every((p) => p >= 0)) checked = true;
    return;
  }
  if (inRect(mouseX, mouseY, btnReset.x, btnReset.y, btnReset.w, btnReset.h)) {
    matchNewGame();
    return;
  }
  dragging = tagAt(mouseX, mouseY);
  moved = false;
  pressX = mouseX;
  pressY = mouseY;
  if (dragging >= 0) {
    offX = mouseX - tags[dragging].x;
    offY = mouseY - tags[dragging].y;
  }
}

// 移動：超過 6 像素才算「拖曳」，標籤跟著滑鼠
function matchMove() {
  if (dragging < 0) return;
  if (!moved && dist(mouseX, mouseY, pressX, pressY) > 6) {
    moved = true;
    selected = -1;
    checked = false;
  }
  if (moved) {
    tags[dragging].x = mouseX - offX;
    tags[dragging].y = mouseY - offY;
  }
}

// 放開：檢查落在哪一格，記錄到 place
function matchUp() {
  if (dragging >= 0 && moved) {
    const si = slotAt(mouseX, mouseY);
    if (si >= 0) placeTag(dragging, si);
    else sendHome(dragging);
  } else if (dragging >= 0) {
    // 沒移動就放開 = 點一下
    clickTag(dragging);
  } else {
    // 點在空白處或卡片上
    const si = slotAt(mouseX, mouseY);
    if (si >= 0 && selected >= 0) {
      placeTag(selected, si);
      selected = -1;
    } else if (si < 0) {
      selected = -1;
    }
  }
  dragging = -1;
  moved = false;
}

function clickTag(i) {
  if (selected >= 0 && selected !== i && tags[i].slot >= 0) {
    // 已有選取的標籤，又點到卡片上的標籤：放到那一格（交換）
    const si = tags[i].slot;
    const pick = selected;
    selected = -1;
    placeTag(pick, si);
  } else {
    selected = selected === i ? -1 : i;
  }
}

function placeTag(ti, si) {
  const prev = tags[ti].slot;
  const old = place[si];
  if (prev >= 0) place[prev] = -1;
  if (old >= 0 && old !== ti) {
    if (prev >= 0) {
      place[prev] = old;
      tags[old].slot = prev;
      snap(old);
    } else {
      sendHome(old);
    }
  }
  place[si] = ti;
  tags[ti].slot = si;
  snap(ti);
  checked = false;
}

function sendHome(ti) {
  const tg = tags[ti];
  if (tg.slot >= 0) place[tg.slot] = -1;
  tg.slot = -1;
  tg.x = tg.hx;
  tg.y = tg.hy;
  checked = false;
}

function snap(ti) {
  const tg = tags[ti];
  const s = slots[tg.slot];
  tg.x = s.x + (cardW - tagW) / 2;
  tg.y = s.y + cardH + 6 + (labelH - 6 - tagH) / 2;
}

function score() {
  let k = 0;
  for (let s = 0; s < slots.length; s++) {
    if (place[s] >= 0 && tags[place[s]].name === slots[s].item.name) k++;
  }
  return k;
}

function tagAt(px, py) {
  for (let i = tags.length - 1; i >= 0; i--) {
    if (inRect(px, py, tags[i].x, tags[i].y, tagW, tagH)) return i;
  }
  return -1;
}

function slotAt(px, py) {
  for (let s = 0; s < slots.length; s++) {
    if (inRect(px, py, slots[s].x, slots[s].y, cardW, cardH + labelH)) return s;
  }
  return -1;
}

// ---------- 連連看的內建動畫（畫布大小 220 x 150） ----------
function cloud(x, y, s, c) {
  noStroke();
  fill(c);
  ellipse(x, y, 60 * s, 34 * s);
  ellipse(x - 20 * s, y + 6 * s, 44 * s, 28 * s);
  ellipse(x + 22 * s, y + 6 * s, 48 * s, 30 * s);
  ellipse(x + 2 * s, y - 12 * s, 38 * s, 30 * s);
}

function drawSunny(t) {
  noStroke();
  fill(135, 206, 250);
  rect(0, 0, 220, 150);
  fill(110, 200, 120);
  rect(0, 122, 220, 28);
  push();
  translate(110, 65);
  rotate(t * 0.6);
  stroke(255, 196, 0);
  strokeWeight(4);
  strokeCap(ROUND);
  for (let i = 0; i < 12; i++) {
    rotate(TWO_PI / 12);
    line(38, 0, 54 + sin(t * 3 + i) * 5, 0);
  }
  pop();
  noStroke();
  fill(255, 214, 0);
  circle(110, 65, 62);
}

function drawCloudy(t) {
  noStroke();
  fill(176, 192, 208);
  rect(0, 0, 220, 150);
  const cols = [color(245), color(228, 232, 238), color(255)];
  for (let i = 0; i < 3; i++) {
    const x = ((t * (12 + i * 6) + i * 110) % 320) - 50;
    cloud(x, 40 + i * 38, 1.3 - i * 0.12, cols[i]);
  }
}

function drawRainy(t) {
  noStroke();
  fill(86, 102, 124);
  rect(0, 0, 220, 150);
  cloud(110, 36, 1.7, color(60, 70, 88));
  stroke(140, 190, 255);
  strokeWeight(2);
  strokeCap(ROUND);
  for (let i = 0; i < 26; i++) {
    const x = (i * 37) % 220;
    const y = ((t * 150 + i * 53) % 110) + 50;
    line(x, y, x - 3, y + 11);
  }
}

function drawSnowy(t) {
  noStroke();
  fill(44, 62, 104);
  rect(0, 0, 220, 150);
  fill(240, 245, 255);
  rect(0, 130, 220, 20);
  for (let i = 0; i < 34; i++) {
    const x = ((i * 47) % 220) + sin(t * 2 + i) * 8;
    const y = (t * (24 + (i % 4) * 8) + i * 29) % 135;
    circle(x, y, 3 + (i % 3));
  }
}

function drawThunder(t) {
  noStroke();
  fill(38, 38, 64);
  rect(0, 0, 220, 150);
  cloud(60, 34, 1.5, color(78, 78, 104));
  cloud(150, 40, 1.7, color(66, 66, 92));
  const ph = t % 2.6;
  const flash = ph < 0.15 || (ph > 0.3 && ph < 0.4);
  if (flash) {
    fill(255, 255, 255, 60);
    rect(0, 0, 220, 150);
    fill(255, 226, 60);
    beginShape();
    vertex(118, 56);
    vertex(96, 96);
    vertex(111, 96);
    vertex(98, 140);
    vertex(138, 86);
    vertex(120, 86);
    vertex(132, 56);
    endShape(CLOSE);
  }
}

function drawWindy(t) {
  noStroke();
  fill(196, 228, 240);
  rect(0, 0, 220, 150);
  noFill();
  stroke(255);
  strokeWeight(3);
  strokeCap(ROUND);
  for (let i = 0; i < 4; i++) {
    const y = 32 + i * 30;
    beginShape();
    for (let x = 0; x <= 220; x += 6) {
      vertex(x, y + sin(x * 0.06 - t * 4 + i) * 6);
    }
    endShape();
  }
  noStroke();
  fill(90, 170, 90);
  for (let i = 0; i < 3; i++) {
    const x = ((t * 100 + i * 90) % 280) - 30;
    const y = 55 + i * 28 + sin(t * 5 + i) * 10;
    push();
    translate(x, y);
    rotate(t * 4 + i);
    ellipse(0, 0, 14, 7);
    pop();
  }
}
