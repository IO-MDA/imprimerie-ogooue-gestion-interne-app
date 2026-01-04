import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn } from 'lucide-react';

export default function PhotosView({ etapes }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const photosData = [];
  etapes.forEach(etape => {
    if (etape.photos_avant?.length > 0) {
      etape.photos_avant.forEach(url => {
        photosData.push({
          url,
          etape: etape.nom,
          categorie: etape.categorie_nom,
          type: 'Avant'
        });
      });
    }
    if (etape.photos_pendant?.length > 0) {
      etape.photos_pendant.forEach(url => {
        photosData.push({
          url,
          etape: etape.nom,
          categorie: etape.categorie_nom,
          type: 'Pendant'
        });
      });
    }
    if (etape.photos_apres?.length > 0) {
      etape.photos_apres.forEach(url => {
        photosData.push({
          url,
          etape: etape.nom,
          categorie: etape.categorie_nom,
          type: 'Après'
        });
      });
    }
  });

  if (photosData.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-slate-500">Aucune photo disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photosData.map((photo, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow overflow-hidden group"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="relative aspect-square">
              <img
                src={photo.url}
                alt={photo.etape}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <Badge className="absolute top-2 right-2 bg-white text-slate-700 shadow">
                {photo.type}
              </Badge>
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium text-slate-900 truncate">{photo.etape}</p>
              <p className="text-xs text-slate-500 truncate">{photo.categorie}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPhoto.etape}</h3>
                  <p className="text-sm text-slate-500">{selectedPhoto.categorie}</p>
                </div>
                <Badge>{selectedPhoto.type}</Badge>
              </div>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.etape}
                className="w-full rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}