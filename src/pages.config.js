import Bilans from './pages/Bilans';
import Catalogue from './pages/Catalogue';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import DemandeModification from './pages/DemandeModification';
import DemandesModification from './pages/DemandesModification';
import DevisFactures from './pages/DevisFactures';
import Messagerie from './pages/Messagerie';
import Parametres from './pages/Parametres';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Taches from './pages/Taches';
import CalendrierTaches from './pages/CalendrierTaches';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Bilans": Bilans,
    "Catalogue": Catalogue,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "DemandeModification": DemandeModification,
    "DemandesModification": DemandesModification,
    "DevisFactures": DevisFactures,
    "Messagerie": Messagerie,
    "Parametres": Parametres,
    "RapportsJournaliers": RapportsJournaliers,
    "Taches": Taches,
    "CalendrierTaches": CalendrierTaches,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};