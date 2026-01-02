import Annonces from './pages/Annonces';
import Avances from './pages/Avances';
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
import Objectifs from './pages/Objectifs';
import Parametres from './pages/Parametres';
import Pointage from './pages/Pointage';
import PortailClient from './pages/PortailClient';
import Projets from './pages/Projets';
import Prospection from './pages/Prospection';
import Rapports from './pages/Rapports';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Taches from './pages/Taches';
import Travaux from './pages/Travaux';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Annonces": Annonces,
    "Avances": Avances,
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
    "Objectifs": Objectifs,
    "Parametres": Parametres,
    "Pointage": Pointage,
    "PortailClient": PortailClient,
    "Projets": Projets,
    "Prospection": Prospection,
    "Rapports": Rapports,
    "RapportsJournaliers": RapportsJournaliers,
    "Taches": Taches,
    "Travaux": Travaux,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};