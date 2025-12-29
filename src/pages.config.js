import Dashboard from './pages/Dashboard';
import RapportsJournaliers from './pages/RapportsJournaliers';
import Bilans from './pages/Bilans';
import DevisFactures from './pages/DevisFactures';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "RapportsJournaliers": RapportsJournaliers,
    "Bilans": Bilans,
    "DevisFactures": DevisFactures,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};