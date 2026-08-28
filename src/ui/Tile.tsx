import { useTileImages } from './useTileImages';
import { tileLabel, type TileId } from '../core/tiles';

export type TileSize = 'sm' | 'md' | 'lg';

interface TileProps {
  id: TileId;
  size?: TileSize;
  /** ツモ牌などを少し浮かせる／傾ける演出 */
  raised?: boolean;
  dimmed?: boolean;
}

export default function Tile({ id, size = 'md', raised = false, dimmed = false }: TileProps) {
  const images = useTileImages();
  const src = images?.get(id);
  return (
    <div
      className={`tile tile-${size}${raised ? ' tile-raised' : ''}${dimmed ? ' tile-dimmed' : ''}`}
      aria-label={tileLabel(id)}
      role="img"
    >
      {src ? (
        <img src={src} alt="" draggable={false} />
      ) : (
        <span className="tile-fallback">{tileLabel(id)}</span>
      )}
    </div>
  );
}
