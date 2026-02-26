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
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Assistant from './pages/Assistant';
import Boards from './pages/Boards';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Integrations from './pages/Integrations';
import Onboarding from './pages/Onboarding';
import Pricing from './pages/Pricing';
import Saves from './pages/Saves';
import Search from './pages/Search';
import Settings from './pages/Settings';
import ShoppingLists from './pages/ShoppingLists';
import Support from './pages/Support';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Analytics": Analytics,
    "Assistant": Assistant,
    "Boards": Boards,
    "Dashboard": Dashboard,
    "Events": Events,
    "Integrations": Integrations,
    "Onboarding": Onboarding,
    "Pricing": Pricing,
    "Saves": Saves,
    "Search": Search,
    "Settings": Settings,
    "ShoppingLists": ShoppingLists,
    "Support": Support,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};