import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Mail, Phone, MapPin, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InscriptionClient() {
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    entreprise: '',
    accepteCGU: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.accepteCGU) {
      toast.error('Veuillez accepter les conditions générales');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('inscrireClient', {
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        entreprise: formData.entreprise
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Inscription réussie ! Vérifiez votre email.');
      } else {
        toast.error(response.data.error || 'Erreur lors de l\'inscription');
      }
    } catch (e) {
      console.error('Erreur:', e);
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-2xl">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Inscription réussie ! 🎉
            </h2>
            <p className="text-slate-600 mb-6">
              Un email de confirmation a été envoyé à <strong>{formData.email}</strong>.
              <br />
              Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
            <Button
              onClick={() => base44.auth.redirectToLogin(window.location.origin + '/PortailClient')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Vérifier mon email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/e66e417ff_LOGO-BON-FINAL1.png" 
            alt="Imprimerie OGOOUE" 
            className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg"
          />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Créez votre compte client
          </h1>
          <p className="text-slate-600">
            Accédez à votre espace personnel et suivez vos commandes en temps réel
          </p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-6 h-6" />
              Inscription
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom */}
              <div>
                <Label htmlFor="nom">Nom complet *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Votre nom complet"
                  required
                  className="mt-1"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="votre.email@example.com"
                    required
                    className="mt-1 pl-10"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <Label htmlFor="telephone">Téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    placeholder="+241 XX XX XX XX"
                    required
                    className="mt-1 pl-10"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({...formData, adresse: e.target.value})}
                    placeholder="Votre adresse à Moanda"
                    className="mt-1 pl-10"
                  />
                </div>
              </div>

              {/* Entreprise */}
              <div>
                <Label htmlFor="entreprise">Entreprise (optionnel)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="entreprise"
                    value={formData.entreprise}
                    onChange={(e) => setFormData({...formData, entreprise: e.target.value})}
                    placeholder="Nom de votre entreprise"
                    className="mt-1 pl-10"
                  />
                </div>
              </div>

              {/* CGU */}
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="cgu"
                  checked={formData.accepteCGU}
                  onCheckedChange={(checked) => setFormData({...formData, accepteCGU: checked})}
                />
                <label htmlFor="cgu" className="text-sm text-slate-600 cursor-pointer">
                  J'accepte les conditions générales d'utilisation et la politique de confidentialité
                </label>
              </div>

              {/* Avantages */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-2">Vos avantages :</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✅ Suivi en temps réel de vos commandes</li>
                  <li>✅ Catalogue avec tarifs personnalisés</li>
                  <li>✅ Historique complet de vos achats</li>
                  <li>✅ Support client dédié</li>
                </ul>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading || !formData.accepteCGU}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Inscription en cours...
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Déjà un compte */}
              <div className="text-center text-sm text-slate-600">
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + '/PortailClient')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Se connecter
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>Besoin d'aide ? Contactez-nous :</p>
          <p className="font-medium mt-1">
            +241 060 44 46 34 / 074 42 41 42
            <br />
            imprimerieogooue@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}