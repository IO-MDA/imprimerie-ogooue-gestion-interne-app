import Annonces from './pages/Annonces';
import Bilans from './pages/Bilans';
import CalendrierTaches from './pages/CalendrierTaches';
import Catalogue from './pages/Catalogue';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import DemandeModification from './pages/DemandeModification';
import DemandesModification from './pages/DemandesModification';
import DevisFactures from './pages/DevisFactures';
import Evenements from './pages/Evenements';
import Messagerie from './pages/Messagerie';
import Parametres from './pages/Parametres';
import Projets from './pages/Projets';
import Prospection from './pages/Prospection';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Taches from './pages/Taches';
import Finances from './pages/Finances';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Annonces": Annonces,
    "Bilans": Bilans,
    "CalendrierTaches": CalendrierTaches,
    "Catalogue": Catalogue,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "DemandeModification": DemandeModification,
    "DemandesModification": DemandesModification,
    "DevisFactures": DevisFactures,
    "Evenements": Evenements,
    "Messagerie": Messagerie,
    "Parametres": Parametres,
    "Projets": Projets,
    "Prospection": Prospection,
    "RapportsJournaliers": RapportsJournaliers,
    "Taches": Taches,
    "Finances": Finances,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};