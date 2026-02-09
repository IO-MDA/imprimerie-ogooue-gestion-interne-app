/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Annonces from './pages/Annonces';
import Avances from './pages/Avances';
import Bilans from './pages/Bilans';
import CalendrierTaches from './pages/CalendrierTaches';
import Catalogue from './pages/Catalogue';
import Chat from './pages/Chat';
import Clients from './pages/Clients';
import Commandes from './pages/Commandes';
import Dashboard from './pages/Dashboard';
import DemandeModification from './pages/DemandeModification';
import DemandesModification from './pages/DemandesModification';
import DemandesRH from './pages/DemandesRH';
import DevisFactures from './pages/DevisFactures';
import Employes from './pages/Employes';
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
import TravauxV2 from './pages/TravauxV2';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Annonces": Annonces,
    "Avances": Avances,
    "Bilans": Bilans,
    "CalendrierTaches": CalendrierTaches,
    "Catalogue": Catalogue,
    "Chat": Chat,
    "Clients": Clients,
    "Commandes": Commandes,
    "Dashboard": Dashboard,
    "DemandeModification": DemandeModification,
    "DemandesModification": DemandesModification,
    "DemandesRH": DemandesRH,
    "DevisFactures": DevisFactures,
    "Employes": Employes,
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
    "TravauxV2": TravauxV2,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};