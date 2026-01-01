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
import Finances from './pages/Finances';
import Messagerie from './pages/Messagerie';
import Mockups from './pages/Mockups';
import Parametres from './pages/Parametres';
import Projets from './pages/Projets';
import Prospection from './pages/Prospection';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Taches from './pages/Taches';
import Rapports from './pages/Rapports';
import PortailClient from './pages/PortailClient';
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
    "Finances": Finances,
    "Messagerie": Messagerie,
    "Mockups": Mockups,
    "Parametres": Parametres,
    "Projets": Projets,
    "Prospection": Prospection,
    "RapportsJournaliers": RapportsJournaliers,
    "Taches": Taches,
    "Rapports": Rapports,
    "PortailClient": PortailClient,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};