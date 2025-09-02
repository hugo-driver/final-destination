export const url = process.env.URL || 'http://localhost:8080';
// Extract domain from `url`
export const domain = new URL(url).hostname;
export const siteName = 'Beldie.ro';
export const siteDescription = 'Site-ul lui Ștefan Beldie despre influența tehnologiei asupra minții tale';
export const siteType = 'Person'; // schema
export const locale = 'ro_RO';
export const lang = 'ro';
export const skipContent = 'Skip to content';
export const author = {
  name: 'Ștefan Beldie', // i.e. Lene Saile - page / blog author's name. Must be set.
  avatar: '/icon-512x512.png', // path to the author's avatar. In this case just using a favicon.
  email: 'stefan@beldie.ro', // i.e. hola@lenesaile.com - email of the author
  website: 'https://beldie.ro', // i.e. https.://www.lenesaile.com - the personal site of the author
  twitter:    'stefan_beldie'
};
export const creator = {
  name: 'Ștefan Beldie', // i.e. Lene Saile - creator's (developer) name.
  email: 'stefan@beldie.ro',
  website: 'https://beldie.ro'
};
export const pathToSvgLogo = 'src/assets/svg/misc/logo.svg'; // used for favicon generation
export const themeColor = '#4467dd'; // used in manifest, for example primary color value
export const themeLight = '#f8f8f8'; // used for meta tag theme-color, if light colors are prefered. best use value set for light bg
export const themeDark = '#2e2e2e'; // used for meta tag theme-color, if dark colors are prefered. best use value set for dark bg
export const opengraph_default = '/assets/images/template/opengraph-default.jpg'; // fallback/default meta image
export const opengraph_default_alt =
  "Site-ul lui Ștefan Beldie despre influența tehnologiei asupra minții tale"; // alt text for default meta image"
export const blog = {
  // RSS feed
  name: 'Ștefan Beldie - Pixel vs Neuron',
  description: 'Beldie despre efectul noilor tehnologii asupra minții tale.',
  // feed links are looped over in the head. You may add more to the array.
  feedLinks: [
    {
      title: 'Atom Feed',
      url: '/feed.xml',
      type: 'application/atom+xml'
    },
    {
      title: 'JSON Feed',
      url: '/feed.json',
      type: 'application/json'
    }
  ],
  // Tags
  tagSingle: 'Tag',
  tagPlural: 'Tags',
  tagMore: 'More tags:',
  // pagination
  paginationLabel: 'Blog',
  paginationPage: 'Page',
  paginationPrevious: 'Anterioară',
  paginationNext: 'Următoarea',
  paginationNumbers: true
};
export const details = {
  aria: 'section controls',
  expand: 'expand all',
  collapse: 'collapse all'
};
export const dialog = {
  close: 'Close',
  next: 'Next',
  previous: 'Previous'
};
export const navigation = {
  navLabel: 'Menu',
  ariaTop: 'Main',
  ariaBottom: 'Complementary',
  ariaPlatforms: 'Platforms',
  drawerNav: false,
  subMenu: false
};
export const themeSwitch = {
  title: 'Temă',
  light: 'light',
  dark: 'dark'
};
export const greenweb = {
  // https://carbontxt.org/
  disclosures: [
    {
      docType: 'sustainability-page',
      url: `${url}/sustainability/`,
      domain: domain
    }
  ],
  services: [{domain: 'netlify.com', serviceType: 'cdn'}]
