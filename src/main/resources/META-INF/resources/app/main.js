/**
 * Dicekeeper SPA – Main Entry Point
 */
import { addRoute, startRouter } from './router.js';
import LoginView from './views/LoginView.js';
import CampaignsView from './views/CampaignsView.js';
import CampaignCreateView from './views/CampaignCreateView.js';
import CampaignDetailView from './views/CampaignDetailView.js';
import CharacterSelectView from './views/CharacterSelectView.js';
import CharacterCreateView from './views/CharacterCreateView.js';
import CharacterReviewView from './views/CharacterReviewView.js';
import ProfileView from './views/ProfileView.js';
import GMView from './views/GMView.js';
import PlayerView from './views/PlayerView.js';
import CockpitView from './views/CockpitView.js';

// Auth
addRoute('/login', () => LoginView());

// Profile
addRoute('/profile', () => ProfileView());

// Campaigns
addRoute('/campaigns', () => CampaignsView());

// Character (non-campaign)
addRoute('/character/create', () => CharacterCreateView());
addRoute('/character/edit/:id', () => CharacterCreateView());

// Campaign – specific sub-routes FIRST (before generic /campaign/:id)
addRoute('/campaign/new', () => CampaignCreateView({ id: 'new' }));
addRoute('/campaign/:id/edit', (p) => CampaignCreateView(p));
addRoute('/campaign/:id/select-character', (p) => CharacterSelectView({ campaignId: p.id }));
addRoute('/campaign/:id/review/:cpId', (p) => CharacterReviewView(p));
addRoute('/campaign/:id/cockpit', (p) => CockpitView(p));
addRoute('/campaign/:id/gm', (p) => GMView(p));
addRoute('/campaign/:id/play', (p) => PlayerView(p));

// Campaign – generic detail LAST
addRoute('/campaign/:id', (p) => CampaignDetailView(p));

// Start
startRouter();
