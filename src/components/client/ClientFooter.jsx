import React from 'react';
import { Phone, Mail, MapPin, Facebook } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function ClientFooter() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white mt-12 pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-8">
        {/* Photo de l'imprimerie */}
        <div className="mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/d3836b1e8_IMG_7126.JPG"
            alt="Imprimerie Ogooué - Moanda"
            className="w-full h-48 md:h-64 object-cover rounded-2xl shadow-2xl"
          />
        </div>

        {/* Informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo et nom */}
          <div className="flex items-start gap-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png" 
              alt="Logo" 
              className="w-16 h-16 rounded-xl bg-white p-2 shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-bold mb-2">IMPRIMERIE OGOOUÉ</h2>
              <p className="text-slate-300 text-sm">
                Votre partenaire impression et services à Moanda
              </p>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Carrefour Fina, en face de Finam</p>
                <p className="text-slate-400 text-sm">Moanda – Gabon 🇬🇦</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <a href="tel:+241060444634" className="hover:text-blue-400 transition-colors">
                  +241 060 44 46 34
                </a>
                <span className="mx-2 text-slate-600">/</span>
                <a href="tel:+241074424142" className="hover:text-blue-400 transition-colors">
                  074 42 41 42
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-red-400 flex-shrink-0" />
              <a 
                href="mailto:imprimerieogooue@gmail.com" 
                className="hover:text-blue-400 transition-colors"
              >
                imprimerieogooue@gmail.com
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Facebook className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <a 
                href="https://www.facebook.com/share/17pppvmFcg/?mibextid=wwXIfr" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors"
              >
                Suivez-nous sur Facebook
              </a>
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-slate-700 my-6"></div>

        {/* Bottom */}
        <div className="text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Imprimerie Ogooué. Tous droits réservés.</p>
          <p className="mt-1 text-xs">
            RCCM: RG/FCV 2023A0407 | Moanda, Haut-Ogooué, Gabon
          </p>
        </div>
      </div>
    </footer>
  );
}