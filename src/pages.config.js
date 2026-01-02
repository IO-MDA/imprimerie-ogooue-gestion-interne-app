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
import Parametres from './pages/Parametres';
import Pointage from './pages/Pointage';
import PortailClient from './pages/PortailClient';
import Projets from './pages/Projets';
import Prospection from './pages/Prospection';
import Rapports from './pages/Rapports';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Taches from './pages/Taches';
import Objectifs from './pages/Objectifs';
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
    "Parametres": Parametres,
    "Pointage": Pointage,
    "PortailClient": PortailClient,
    "Projets": Projets,
    "Prospection": Prospection,
    "Rapports": Rapports,
    "RapportsJournaliers": RapportsJournaliers,
    "Taches": Taches,
    "Objectifs": Objectifs,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};