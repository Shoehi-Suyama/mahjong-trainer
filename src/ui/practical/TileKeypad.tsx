import Tile from '../Tile';
import { type TileId } from '../../core/tiles';

const GROUPS: { label: string; ids: TileId[] }[] = [
  { label: '萬子', ids: ['man1', 'man2', 'man3', 'man4', 'man5', 'man6', 'man7', 'man8', 'man9'] },
  { label: '筒子', ids: ['pin1', 'pin2', 'pin3', 'pin4', 'pin5', 'pin6', 'pin7', 'pin8', 'pin9'] },
  { label: '索子', ids: ['sou1', 'sou2', 'sou3', 'sou4', 'sou5', 'sou6', 'sou7', 'sou8', 'sou9'] },
  { label: '字牌', ids: ['east', 'south', 'west', 'north', 'white', 'green', 'red'] },
];

interface TileKeypadProps {
  onPick: (id: TileId) => void;
  /** 各牌の現在使用枚数（×N バッジと4枚での無効化に使う） */
  counts?: Map<TileId, number>;
  /** さらに無効化したい牌 */
  disabled?: (id: TileId) => boolean;
  size?: 'sm' | 'md';
}

export default function TileKeypad({ onPick, counts, disabled, size = 'md' }: TileKeypadProps) {
  return (
    <div className="keypad">
      {GROUPS.map((g) => (
        <div key={g.label} className="keypad-group">
          <div className="keypad-label">{g.label}</div>
          <div className="keypad-row">
            {g.ids.map((id) => {
              const n = counts?.get(id) ?? 0;
              const off = n >= 4 || (disabled?.(id) ?? false);
              return (
                <button
                  key={id}
                  className="keypad-tile"
                  disabled={off}
                  onClick={() => onPick(id)}
                >
                  <Tile id={id} size={size} />
                  {n > 0 && <span className="keypad-count">×{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
