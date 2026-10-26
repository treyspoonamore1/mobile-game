import { useState } from 'preact/hooks';
import type { Game } from '../../app/game.ts';
import type { Settings } from '../../meta/save.ts';
import { duration, fmt } from '../format.ts';
import { Btn, Toggle, useSave } from '../widgets.tsx';
import { ModalFrame } from './ModalHost.tsx';

type Pane = 'main' | 'export' | 'import';

export function SettingsModal({ game }: { game: Game }) {
  const [pane, setPane] = useState<Pane>('main');
  return (
    <ModalFrame game={game} title="Settings" class="settings-modal">
      {pane === 'main' && <Main game={game} setPane={setPane} />}
      {pane === 'export' && <Export game={game} back={() => setPane('main')} />}
      {pane === 'import' && <Import game={game} back={() => setPane('main')} />}
    </ModalFrame>
  );
}

function Main({ game, setPane }: { game: Game; setPane: (p: Pane) => void }) {
  const save = useSave(game);
  const s = save.settings;
  const set = (p: Partial<Settings>) => game.setSettings(p);
  const [confirmReset, setConfirmReset] = useState(false);
  const L = save.lifetime;
  const stats: [string, string][] = [
    ['Best floor', String(save.bestFloor)],
    ['Pilgrimages', String(save.pilgrimages)],
    ['Healed', fmt(L.healed)],
    ['Perfects', fmt(L.perfects)],
    ['Saves', fmt(L.saves)],
    ['Kills', fmt(L.kills)],
    ['Floors', fmt(L.floors)],
    ['Wipes', fmt(L.wipes)],
    ['Play time', duration(L.seconds)],
  ];
  return (
    <>
      <div class="set-group">
        <Slider label="Sound FX" value={s.sfx} onInput={(v) => set({ sfx: v })} />
        <Slider label="Music" value={s.music} onInput={(v) => set({ music: v })} />
        <div class="set-row">
          <span>Vibration</span>
          <Toggle game={game} label="Vibration" on={s.haptics} onChange={(v) => set({ haptics: v })} />
        </div>
        <div class="set-row">
          <span>Damage numbers</span>
          <Toggle game={game} label="Damage numbers" on={s.numbers} onChange={(v) => set({ numbers: v })} />
        </div>
      </div>
      <h4 class="modal-sub">Lifetime</h4>
      <dl class="stats-list">
        {stats.map(([k, v]) => (
          <div>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h4 class="modal-sub">Save</h4>
      <div class="set-buttons">
        <Btn game={game} tone="blue" onPress={() => setPane('export')}>Export</Btn>
        <Btn game={game} tone="blue" onPress={() => setPane('import')}>Import</Btn>
      </div>
      <div class="danger">
        {confirmReset ? (
          <>
            <p>Erase everything, Devotion included? This cannot be undone.</p>
            <div class="set-buttons">
              <Btn game={game} tone="plain" onPress={() => setConfirmReset(false)}>Keep it</Btn>
              <Btn game={game} tone="red" onPress={() => game.resetSave()}>Erase</Btn>
            </div>
          </>
        ) : (
          <Btn game={game} tone="red" class="full" onPress={() => setConfirmReset(true)}>Reset save…</Btn>
        )}
      </div>
      <p class="credits">Lifeline — made with Claude Code</p>
    </>
  );
}

function Slider({ label, value, onInput }: { label: string; value: number; onInput: (v: number) => void }) {
  const pctVal = Math.round(value * 100);
  return (
    <label class="set-row slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pctVal}
        style={{ '--fill': `${pctVal}%` }}
        onInput={(e) => onInput(Number((e.currentTarget as HTMLInputElement).value) / 100)}
      />
      <b class="slider-val">{pctVal}</b>
    </label>
  );
}

function Export({ game, back }: { game: Game; back: () => void }) {
  const [text] = useState(() => game.exportSave());
  const [copied, setCopied] = useState<'no' | 'yes' | 'fail'>('no');
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      setCopied('yes');
    } catch {
      setCopied('fail');
    }
  };
  return (
    <>
      <p class="modal-lead">Keep this text somewhere safe. Paste it into Import to restore your progress.</p>
      <textarea class="save-text" readOnly value={text} onFocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
      {copied === 'fail' && <p class="warn">Couldn't copy. Select the text and copy it by hand.</p>}
      <div class="set-buttons">
        <Btn game={game} tone="plain" onPress={back}>Back</Btn>
        <Btn game={game} onPress={() => void copy()}>{copied === 'yes' ? 'Copied!' : 'Copy'}</Btn>
      </div>
    </>
  );
}

function Import({ game, back }: { game: Game; back: () => void }) {
  const [text, setText] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <>
      <p class="modal-lead">Paste a save. It replaces your current progress.</p>
      <textarea
        class="save-text"
        value={text}
        placeholder="Paste save text here"
        onInput={(e) => {
          setText((e.currentTarget as HTMLTextAreaElement).value);
          setBad(false);
        }}
      />
      {bad && <p class="warn">That save could not be read.</p>}
      <div class="set-buttons">
        <Btn game={game} tone="plain" onPress={back}>Back</Btn>
        <Btn
          game={game}
          dim={text.trim() === ''}
          onPress={() => {
            const ok = game.importSave(text.trim());
            setBad(!ok);
            return ok;
          }}
        >
          Load save
        </Btn>
      </div>
    </>
  );
}
