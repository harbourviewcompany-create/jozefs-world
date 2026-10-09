const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'career.js'), 'utf8');
const CORRECT = [[0,1,1],[0,1,0],[1,0,0],[1,0,0],[0,0,0],[0,1,0]];

function browser(storage = new Map()) {
  const nodes = new Map();
  const awards = [];
  class Node {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.events = {};
      this.textContent = '';
      this.className = '';
      this.hidden = false;
      this.disabled = false;
    }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren(...children) { this.children = children; }
    addEventListener(event, fn) { this.events[event] = fn; }
    click() { assert.equal(this.disabled, false); assert.equal(typeof this.events.click, 'function'); this.events.click(); }
  }
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, new Node(id));
      return nodes.get(id);
    },
    createElement: type => new Node(type)
  };
  const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, val) => storage.set(key, String(val))
  };
  const window = { JozefWorld: { record: (action, details) => awards.push({ action, ...details }) } };
  vm.runInNewContext(source, { document, localStorage, window }, { timeout: 1500 });
  const elements = id => document.getElementById(id).children;
  const choose = (id, index) => elements(id)[index].click();
  const state = () => JSON.parse(storage.get('jozefs-world-career-v1'));
  return { choose, state, storage, awards, progress: () => window.JozefCareer.getProgress(), elements };
}

function playMatch(b, round, trainingIndex, decisions) {
  b.choose('career-controls', 0); // start match
  assert.equal(b.elements('career-choices').length, 3, 'training options rendered');
  b.choose('career-choices', trainingIndex);
  for (let i = 0; i < 3; i++) {
    assert.equal(b.elements('career-choices').length, 3, 'three match choices rendered');
    b.choose('career-choices', decisions[i]);
    assert.equal(b.elements('career-controls').length, 1, 'coach feedback allows next play');
    b.choose('career-controls', 0);
  }
  assert.equal(b.progress().played, round + 1);
}

test('all six perfect matches award the league championship', () => {
  const b = browser();
  for (let i = 0; i < 6; i++) playMatch(b, i, 1, CORRECT[i]);
  assert.equal(b.progress().points, 18);
  assert.equal(b.progress().cups, 1);
  assert.equal(b.awards.filter(x => x.action === 'career').length, 6);
  assert.equal(b.awards.filter(x => x.action === 'training').length, 6);
  assert.equal(b.awards.filter(x => x.action === 'leaguechamp').length, 1);
  b.choose('career-controls', 0); // new season
  assert.equal(b.progress().season, 2);
  assert.equal(b.progress().played, 0);
  assert.equal(b.progress().cups, 1, 'trophies persist');
});

test('unsuccessful answers never auto-award a championship', () => {
  const b = browser();
  for (let i = 0; i < 6; i++) playMatch(b, i, 0, CORRECT[i].map((right) => (right + 1) % 3));
  assert.equal(b.progress().points, 0);
  assert.equal(b.progress().cups, 0);
  assert.equal(b.awards.filter(x => x.action === 'training').length, 0);
  assert.equal(b.awards.filter(x => x.action === 'leaguechamp').length, 0);
});

test('partial season resumes after refresh without replaying fixtures', () => {
  const storage = new Map();
  let b = browser(storage);
  playMatch(b, 0, 1, CORRECT[0]);
  playMatch(b, 1, 1, CORRECT[1]);
  b = browser(storage);
  assert.equal(b.progress().played, 2);
  assert.equal(b.progress().points, 6);
  playMatch(b, 2, 1, CORRECT[2]);
  assert.equal(b.progress().played, 3);
});

test('root HTML matches the publishing source and interactive panels are correctly nested', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const canonical = fs.readFileSync(path.join(root, 'world.html'), 'utf8');
  assert.equal(html, canonical, 'index.html and world.html should be synchronized on main');
  const games = html.slice(html.indexOf('<section id="games"'), html.indexOf('<!-- WORLD TOUR ADVENTURE -->'));
  const learn = html.slice(html.indexOf('<section id="learn"'), html.indexOf('<!-- FUN ZONE SECTION -->'));
  assert.ok(games.includes('id="scramble-game"'), 'word scramble must be a Games panel');
  assert.ok(learn.includes('id="learn-positions"'), 'field positions must be in Learn');
  assert.ok(html.includes('id="career"'));
  assert.ok(html.includes('src="career.js"'));
  assert.ok(html.includes('href="career.css"'));
});

test('unique navigation, game canvases and script entrypoints across a cinematic homepage',()=>{
  const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
  const namedIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  const seen=new Set();
  const collisions=[];
  for(const id of namedIds){if(seen.has(id))collisions.push(id);seen.add(id);}
  assert.deepEqual(collisions,[],'duplicate id attributes make games load incorrectly');
  for(const id of ['street','street-canvas','street-start','street-left','street-right','studio-career-points','studio-street-best']){
    assert.ok(seen.has(id),'missing '+id);
  }
  const nav=[...html.matchAll(/data-section="street"/g)];
  assert.equal(nav.length,1,'one STREET//11 navigation entry');
  for(const file of ['stadium.css','stadium.js','street.js','arcade.css','arcade.js']){
    const escaped=file.replace(/\./g,'\\.');
    const matches=[...html.matchAll(new RegExp('(?:src|href)="'+escaped+'"','g'))];
    assert.equal(matches.length,1,'load '+file+' exactly once');
  }
  const pre=html.indexOf('<section id="street"');
  const games=html.indexOf('<section id="games"');
  assert.ok(pre>0&&pre<games,'street game must appear before training games');
});
