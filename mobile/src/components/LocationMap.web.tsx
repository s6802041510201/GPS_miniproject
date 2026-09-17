import { MapPreview } from '@/components/MapPreview';
import { MapPoint } from './LocationMap';

type Props = {
  classroom: MapPoint & { roomName: string; radius: number };
  studentLocation?: MapPoint;
  fullScreen?: boolean;
};

export function LocationMap({ classroom, studentLocation, fullScreen = false }: Props) {
  return <MapPreview classroom={classroom} fullScreen={fullScreen} studentLocation={studentLocation} />;
}
