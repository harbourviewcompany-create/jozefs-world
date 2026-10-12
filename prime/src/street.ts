import Phaser from 'phaser';
import { LANES, DURATION, BEST_KEY, paceOf, collect, type Pickup, type Kind } from './street-rules';
import {awardClubProgress,recordHighlight} from './rules';

const W = 960, H = 540;
let soundOn = false;
let audio: AudioContext | null = null;
export function setStreetSound(on: boolean) { soundOn = on; }
function tone(freq: number, ms: number) {
  if (!soundOn) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + ms / 1000);
  } catch { /* sound is optional */ }
}

export class StreetScene extends Phaser.Scene {
  private state: 'ready' | 'counting' | 'playing' | 'paused' | 'over' = 'ready';
  private pausedFrom: 'counting'|'playing'='playing';
  private countdown:Phaser.Time.TimerEvent|null=null;
  private reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
  private lastHud='';
  private height=H;
  private lane = 1; private target = 1; private x = LANES[1];
  private items: Pickup[] = []; private spawnIn = 0; private elapsed = 0;
  private score = 0; private hearts = 3; private combo = 0; private shield = 0; private golden = 0; private best = 0;
  private scroll = 0; private seed = 1;
  private road!: Phaser.GameObjects.Graphics;
  private city!: Phaser.GameObjects.Graphics;
  private bits!: Phaser.GameObjects.Graphics;
  private runner!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;

  constructor() { super('street'); }

  create() {
    this.height=this.scale.gameSize.height;
    this.state='ready';this.items=[];this.elapsed=0;this.score=0;this.hearts=3;this.lastHud='';
    this.lane=this.target=1;this.x=LANES[1];this.scroll=0;this.count=0;this.countdown=null;
    try { this.best = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { this.best = 0; }
    this.cameras.main.setBackgroundColor('#071018');
    this.city = this.add.graphics();
    this.road = this.add.graphics();
    this.bits = this.add.graphics();
    this.runner = this.add.container(this.x, this.height-110).setScale(1.4);
    const body = this.add.rectangle(0, 8, 42, 46, 0x123c42).setStrokeStyle(4, 0xcafa60);
    const num = this.add.text(0, 6, '11', { fontFamily: 'system-ui', fontSize: '18px', color: '#cafa60', fontStyle: '900' }).setOrigin(0.5);
    const head = this.add.circle(0, -28, 12, 0xf3c7a6);
    const hair = this.add.ellipse(0, -34, 22, 12, 0x241c18);
    const eyeL = this.add.circle(-4, -28, 1.6, 0x243044);
    const eyeR = this.add.circle(4, -28, 1.6, 0x243044);
    const ball = this.add.circle(18, 22, 7, 0xffffff);
    this.runner.add([body, num, head, hair, eyeL, eyeR, ball]);
    this.title = this.add.text(W / 2, 70, 'READY, CAPTAIN?', { fontFamily: 'system-ui', fontSize: '32px', color: '#ffffff', fontStyle: '900' }).setOrigin(0.5);
    this.sub = this.add.text(W / 2, 108, 'Three lanes. Dodge red. Chase the lights.', { fontFamily: 'system-ui', fontSize: '16px', color: '#cafa60' }).setOrigin(0.5);
    this.paintCity();
    this.game.events.on(Phaser.Core.Events.BLUR,this.onBlur,this);
    this.game.events.on(Phaser.Core.Events.HIDDEN,this.onBlur,this);
    this.events.once('shutdown',()=>{this.game.events.off(Phaser.Core.Events.BLUR,this.onBlur,this);this.game.events.off(Phaser.Core.Events.HIDDEN,this.onBlur,this);this.countdown?.remove();});
    this.hud();
  }

  start() {
    if(this.state==='counting'||this.state==='playing'||this.state==='paused')return;
    this.seed = (Math.floor(Math.random() * 4294967296) || 123456789) >>> 0;
    this.lane = this.target = 1; this.x = LANES[1];
    this.items = []; this.spawnIn = 0.32; this.elapsed = 0; this.score = 0; this.hearts = 3; this.combo = 0; this.shield = 0; this.golden = 0;
    this.state = 'counting';
    this.count = 3;
    this.hud();
    this.say('3');
    this.countdown=this.time.addEvent({ delay: 700, repeat: 2, callback: () => {
      this.count -= 1;
      if (this.count > 0) this.say(String(this.count));
      else { this.state = 'playing'; this.say(''); this.sub.setText('Dodge red. Chase the lights.'); }
      this.hud();
    }});
  }
  private count = 0;
  private sub!: Phaser.GameObjects.Text;
  private say(text: string) { this.title.setText(text || (this.state === 'playing' ? '' : 'READY, CAPTAIN?')); }
  private onBlur(){if(this.state==='playing'||this.state==='counting')this.pause();}
  pause() {
    if(this.state==='playing'||this.state==='counting'){
      this.pausedFrom=this.state;this.state='paused';if(this.countdown)this.countdown.paused=true;
    }else if(this.state==='paused'){
      this.state=this.pausedFrom;if(this.countdown)this.countdown.paused=false;
    }
    this.hud();
  }
  move(delta: number) { if (this.state === 'playing') this.target = Math.max(0, Math.min(2, this.target + delta)); }
  progress() { return { best: this.best, state: this.state, score: this.score, hearts: this.hearts }; }

  private rand() { this.seed = (1664525 * this.seed + 1013904223) >>> 0; return this.seed / 4294967296; }
  private spawn() {
    const lane = Math.floor(this.rand() * 3);
    const roll = this.rand();
    const kind: Kind = roll < .38 ? 'star' : roll < .80 ? 'defender' : roll < .89 ? 'shield' : 'gold';
    this.items.push({ lane, y: -30, kind, hit: false });
  }
  private hud() {
    const signature=[this.state,this.count,Math.ceil(Math.max(0,DURATION-this.elapsed)),this.score,this.hearts,this.best].join(':');
    if(signature===this.lastHud)return;this.lastHud=signature;
    const time = document.getElementById('street-time');
    const score = document.getElementById('street-score');
    const hearts = document.getElementById('street-hearts');
    const best = document.getElementById('street-best');
    if (time) time.textContent = String(Math.ceil(Math.max(0, DURATION - this.elapsed)));
    if (score) score.textContent = String(this.score);
    if (hearts) hearts.textContent = '♥'.repeat(this.hearts) + '♡'.repeat(3 - this.hearts);
    if (best) best.textContent = String(this.best);
    const go=document.getElementById('street-go') as HTMLButtonElement|null;
    if(go){go.textContent=this.state==='playing'?'PAUSE':this.state==='paused'?'RESUME':this.state==='counting'?String(this.count):this.state==='over'?'PLAY AGAIN':'START';go.disabled=this.state==='counting';}
    const headline=document.getElementById('score');if(headline)headline.textContent=this.score+' POINTS';
    const round=document.getElementById('round');if(round)round.textContent='—';
    const turns=document.getElementById('turns');if(turns)turns.textContent='55 SECOND RUN';
  }
  private finish() {
    if (this.state !== 'playing') return;
    this.state = 'over';
    const newRecord=this.score>this.best;
    if (this.score > this.best) { this.best = this.score; tone(520, 280); try { localStorage.setItem(BEST_KEY, String(this.best)); } catch { /* this visit */ } }
    window.dispatchEvent(new Event('jozef:street-completed'));
    const record = newRecord ? ' New record.' : ' Record ' + this.best + '.';
    awardClubProgress(localStorage,'street',this.score);
    recordHighlight(localStorage,'street',this.score);
    this.sub.setText(this.score + ' points.' + record);
    const line = document.getElementById('street-result');
    if (line) line.textContent = 'Full-time. ' + this.score + ' points.' + record;
    this.hud();
  }

  update(_: number, delta: number) {
    const dt = Math.min(0.036, delta / 1000);
    if (this.state === 'playing') {
      this.elapsed += dt;
      const pace = paceOf(this.elapsed);
      const before = this.x;
      this.x += (LANES[this.target] - this.x) * Math.min(1, dt * 10);
      if (!this.reduce&&Math.abs(this.x - before) > 1) this.runner.rotation = (this.x - before) * 0.01;
      else this.runner.rotation *= 0.8;
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) { this.spawn(); this.spawnIn = 0.78 - pace * 0.105 + this.rand() * 0.26; }
      const speed = 220 + pace * 50;
      for (const item of this.items) {
        item.y += speed * dt;
        if (!item.hit && Math.abs(item.y - (this.height-110)) < 28 && Math.abs(LANES[item.lane] - this.x) < 40) {
          item.hit = true;
          const hit = collect(item.kind, this.combo, this.shield);
          this.score += hit.score; this.combo = hit.combo; this.shield = hit.shield; this.hearts = Math.max(0, this.hearts + hit.hearts);
          if (item.kind === 'gold') this.golden += 1;
          if (item.kind === 'star' || item.kind === 'gold') { tone(item.kind === 'gold' ? 640 : 480, 120); this.burst(LANES[item.lane], item.y, item.kind === 'gold' ? 0xffd166 : 0xcafa60); }
          else if (item.kind === 'shield') tone(360, 140);
          else if (hit.hearts < 0) { tone(180, 160); if(!this.reduce)this.cameras.main.shake(120, 0.008); }
          else tone(220, 90);
        }
      }
      this.items = this.items.filter(item => item.y < this.height+80);
      this.scroll += speed * dt;
      if (this.hearts === 0 || this.elapsed >= DURATION) this.finish();
      this.hud();
    }
    this.draw();
  }

  private burst(x: number, y: number, color: number) {
    if(this.reduce)return;
    for (let i = 0; i < 6; i++) {
      const bit = this.add.circle(x, y, 3, color);
      this.tweens.add({ targets: bit, x: x + (i - 3) * 12, y: y - 20 - i * 4, alpha: 0, duration: 280, onComplete: () => bit.destroy() });
    }
  }
  private paintCity() {
    for (let i = 0; i < 8; i++) {
      const h = 80 + ((i * 37) % 90);
      this.city.fillStyle(0x10242c, 1);
      this.city.fillRect(20 + i * 40, 180 - h, 28, h);
      this.city.fillRect(700 + i * 30, 160 - h, 24, h);
    }
    this.city.fillStyle(0xcafa60, 0.15);
    this.city.fillCircle(160, 40, 18);
    this.city.fillCircle(800, 50, 16);
  }
  private draw() {
    this.road.clear();
    this.road.fillStyle(0x0d1b22, 1);
    this.road.fillRect(180, 0, 600, this.height);
    this.road.lineStyle(2, 0x1f4d46, 0.7);
    LANES.forEach(x => this.road.lineBetween(x, 0, x, this.height));
    this.road.lineStyle(3, 0xcafa60, 0.25);
    for (let y = -40; y < this.height; y += 46) this.road.lineBetween(480, (y + this.scroll) % (this.height + 46) - 20, 480, ((y + this.scroll) % (this.height + 46)) + 16);
    this.bits.clear();
    this.items.forEach(item => {
      if (item.hit) return;
      const color = item.kind === 'star' ? 0xcafa60 : item.kind === 'gold' ? 0xffd166 : item.kind === 'shield' ? 0x7ee0ff : 0xff5b60;
      this.bits.fillStyle(color, 0.25);
      this.bits.fillCircle(LANES[item.lane], item.y, 22);
      this.bits.fillStyle(color, 1);
      this.bits.fillCircle(LANES[item.lane], item.y, item.kind === 'defender' ? 16 : 11);
    });
    this.runner.setPosition(this.x, this.height-110);
    if(this.state==='paused')this.title.setText('PAUSED');
    else if(this.state==='counting')this.title.setText(String(this.count));
    else this.title.setText(this.state==='playing'?'':this.state==='over'?'FULL-TIME':'READY, CAPTAIN?');
  }
}
