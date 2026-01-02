import Annonces from './pages/Annonces';
import Avances from './pages/Avances';
import Bilans from './pages/Bilans';
import CalendrierTaches from './pages/CalendrierTaches';
import Catalogue from './pages/Catalogue';
import Clients from './pages/Clients';
import Commandes from './pages/Commandes';
import Dashboard from './pages/Dashboard';
import DemandeModification from './pages/DemandeModification';
import DemandesModification from './pages/DemandesModification';
import DemandesRH from './pages/DemandesRH';
import DevisFactures from './pages/DevisFactures';
import Evenements from './pages/Evenements';
import Finances from './pages/Finances';
import InscriptionClient from './pages/InscriptionClient';
import Messagerie from './pages/Messagerie';
import Mockups from './pages/Mockups';
import ModelesDocuments from './pages/ModelesDocuments';
import Objectifs from './pages/Objectifs';
import Parametres from './pages/Parametres';
import PerformanceEmployes from './pages/PerformanceEmployes';
import Pointage from './pages/Pointage';
import PortailClient from './pages/PortailClient';
import Projets from './pages/Projets';
import Prospection from './pages/Prospection';
import Rapports from './pages/Rapports';
import RapportsJournaliers from './pages/RapportsJournaliers';
import StatsPointage from './pages/StatsPointage';
import TableauBordRH from './pages/TableauBordRH';
import Taches from './pages/Taches';
import TarifsClients from './pages/TarifsClients';
import Travaux from './pages/Travaux';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Annonces": Annonces,
    "Avances": Avances,
    "Bilans": Bilans,
    "CalendrierTaches": CalendrierTaches,
    "Catalogue": Catalogue,
    "Clients": Clients,
    "Commandes": Commandes,
    "Dashboard": Dashboard,
    "DemandeModification": DemandeModification,
    "DemandesModification": DemandesModification,
    "DemandesRH": DemandesRH,
    "DevisFactures": DevisFactures,
    "Evenements": Evenements,
    "Finances": Finances,
    "InscriptionClient": InscriptionClient,
    "Messagerie": Messagerie,
    "Mockups": Mockups,
    "ModelesDocuments": ModelesDocuments,
    "Objectifs": Objectifs,
    "Parametres": Parametres,
    "PerformanceEmployes": PerformanceEmployes,
    "Pointage": Pointage,
    "PortailClient": PortailClient,
    "Projets": Projets,
    "Prospection": Prospection,
    "Rapports": Rapports,
    "RapportsJournaliers": RapportsJournaliers,
    "StatsPointage": StatsPointage,
    "TableauBordRH": TableauBordRH,
    "Taches": Taches,
    "TarifsClients": TarifsClients,
    "Travaux": Travaux,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};