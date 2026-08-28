import Tile, { type TileSize } from './Tile';
import { sortTileIds, type TileId } from '../core/tiles';
import type { Meld } from '../core/hand';

interface HandViewProps {
  /** 手の内（和了牌を除く13枚など）。表示前にソートする。 */
  concealed: TileId[];
  winningTile?: TileId;
  melds?: Meld[];
  size?: TileSize;
  /** 和了牌をツモ表示（右に余白）にするか */
  tsumo?: boolean;
  /** 赤ドラにする牌ID（同種の最初の1枚を赤扱い） */
  akaTiles?: TileId[];
}

export default function HandView({
  concealed,
  winningTile,
  melds = [],
  size = 'md',
  tsumo,
  akaTiles = [],
}: HandViewProps) {
  const sorted = sortTileIds(concealed);
  const akaLeft = new Map<TileId, number>();
  for (const t of akaTiles) akaLeft.set(t, (akaLeft.get(t) ?? 0) + 1);
  const takeAka = (id: TileId) => {
    const n = akaLeft.get(id) ?? 0;
    if (n > 0) {
      akaLeft.set(id, n - 1);
      return true;
    }
    return false;
  };

  return (
    <div className="handview">
      <div className="handview-tiles">
        {sorted.map((id, i) => (
          <Tile key={`c${i}`} id={id} size={size} aka={takeAka(id)} />
        ))}
        {winningTile && (
          <span className={tsumo ? 'handview-draw' : 'handview-ron'}>
            <Tile id={winningTile} size={size} raised aka={takeAka(winningTile)} />
          </span>
        )}
      </div>
      {melds.length > 0 && (
        <div className="handview-melds">
          <span className="meld-label">鳴き</span>
          {melds.map((m, mi) => (
            <span key={mi} className="meld">
              {m.tiles.map((id, ti) => (
                <Tile key={ti} id={id} size={size} dimmed={m.open} />
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
