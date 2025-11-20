import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

interface LocationPickerProps {
  locationName: string;
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  onLocationNameChange: (name: string) => void;
}

export const LocationPicker = ({
  locationName,
  lat,
  lng,
  onLocationChange,
  onLocationNameChange,
}: LocationPickerProps) => {
  const { t } = useTranslation();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    id: 'google-map-script',
  });
  
  // Initialize with provided coordinates if available
  const initialPosition = lat && lng ? { lat, lng } : null;
  const initialCenter = lat && lng ? { lat, lng } : { lat: 40.4168, lng: -3.7038 };
  
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(initialPosition);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(initialCenter);

  // Update marker and center when lat/lng props change
  useEffect(() => {
    if (lat && lng) {
      const newPosition = { lat, lng };
      setMarkerPosition(newPosition);
      setMapCenter(newPosition);
    }
  }, [lat, lng]);

  // Get user's current location only if no coordinates provided
  useEffect(() => {
    if (!lat && !lng && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Keep default center (Madrid) if geolocation fails
        }
      );
    }
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setMarkerPosition({ lat: newLat, lng: newLng });
      onLocationChange(newLat, newLng);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setMarkerPosition({ lat: newLat, lng: newLng });
      onLocationChange(newLat, newLng);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="location-name">{t('activities.locationName', 'Location Name')}</Label>
          <Input
            id="location-name"
            value={locationName}
            onChange={(e) => onLocationNameChange(e.target.value)}
            placeholder={t('activities.locationPlaceholder', 'e.g. School Auditorium')}
          />
        </div>
        <div className="text-sm text-destructive">
          {t('activities.mapLoadError', 'Error loading map. Please try again.')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="location-name">{t('activities.locationName', 'Location Name')}</Label>
        <Input
          id="location-name"
          value={locationName}
          onChange={(e) => onLocationNameChange(e.target.value)}
          placeholder={t('activities.locationPlaceholder', 'e.g. School Auditorium')}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('activities.selectOnMap', 'Click on map to select location')}</Label>
        {!isLoaded ? (
          <Skeleton className="w-full h-[400px] rounded-lg" />
        ) : (
          <GoogleMap
            mapContainerClassName="w-full h-[400px] rounded-lg border"
            center={markerPosition || mapCenter}
            zoom={13}
            onClick={handleMapClick}
          >
            {markerPosition && (
              <Marker
                position={markerPosition}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
              />
            )}
          </GoogleMap>
        )}
        {lat && lng && (
          <p className="text-sm text-muted-foreground">
            {t('activities.coordinates', 'Coordinates')}: {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
};
