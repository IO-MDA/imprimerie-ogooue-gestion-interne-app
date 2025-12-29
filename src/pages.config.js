import Dashboard from './pages/Dashboard';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Bilans from './pages/Bilans';
import DevisFactures from './pages/DevisFactures';
import Catalogue from './pages/Catalogue';
import Clients from './pages/Clients';
import Messagerie from './pages/Messagerie';
import DemandesModification from './pages/DemandesModification';
import Parametres from './pages/Parametres';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "RapportsJournaliers": RapportsJournaliers,
    "Bilans": Bilans,
    "DevisFactures": DevisFactures,
    "Catalogue": Catalogue,
    "Clients": Clients,
    "Messagerie": Messagerie,
    "DemandesModification": DemandesModification,
    "Parametres": Parametres,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};