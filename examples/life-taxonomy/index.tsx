import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as r from '../../src';
import { PrefixTrie } from '../../src/parser';
import LifeTreeMenu from './LifeTreeMenu';
import theme, { linkStyle } from './theme';
import jss from 'jss'
import Spinner from './Spinner';
import Breadcrumbs from './Breadcrumbs';
const readme = require('./README.md');


// https://en.wikipedia.org/wiki/Cavalier-Smith%27s_system_of_classification#Kingdom_Animalia
export const parser = r.oneOf([
  r.tag('Home').path('/readme').extra({ title: 'README.md' }),
  r.tag('Kingdom/animalia').path('/animalia').extra({ title: 'Kingdom Animalia', wikiLink: '/wiki/Animal' }),
  r.tag('Subkingdom/radiata').path('/animalia/radiata').extra({ title: 'Subkingdom Radiata', wikiLink: '/wiki/Radiata' }),
  r.tag('Infrakingdom/spongiaria').path('/animalia/radiata/spongiaria').extra({ title: 'Infrakingdom Spongiaria', wikiLink: '/wiki/Spongiaria' }),
  r.tag('Phylum/porifera').path('/animalia/radiata/spongiaria/porifera').extra({ title: 'Phylum Porifera', wikiLink: '/wiki/Porifera' }),
  r.tag('Infrakingdom/coelenterata').path('/animalia/radiata/coelenterata').extra({ title: 'Infrakingdom Coelenterata', wikiLink: '/wiki/Coelenterata' }),
  r.tag('Phylum/cnidaria').path('/animalia/radiata/coelenterata/cnidaria').extra({ title: 'Phylum Cnidaria', wikiLink: '/wiki/Cnidaria' }),
  r.tag('Phylum/ctenophora').path('/animalia/radiata/coelenterata/ctenophora').extra({ title: 'Phylum Ctenophora', wikiLink: '/wiki/Ctenophora' }),
  r.tag('Infrakingdom/placozoa').path('/animalia/radiata/placozoa').extra({ title: 'Infrakingdom Placozoa', wikiLink: '/wiki/Placozoa' }),
  r.tag('Phylum/placozoa').path('/animalia/radiata/placozoa/placozoa').extra({ title: 'Phylum Placozoa', wikiLink: '/wiki/Placozoa' }),
  r.tag('Subkingdom/myxozoa').path('/animalia/myxozoa').extra({ title: 'Subkingdom Myxozoa', wikiLink: '/wiki/Myxozoa' }),
  r.tag('Phylum/myxosporidia').path('/animalia/myxozoa/myxosporidia').extra({ title: 'Phylum Myxosporidia', wikiLink: '/wiki/Myxosporea' }),
  r.tag('Subkingdom/bilateria').path('/animalia/bilateria').extra({ title: 'Subkingdom Bilateria', wikiLink: '/wiki/Bilateria' }),
  r.tag('Branch/protostomia').path('/animalia/bilateria/protostomia').extra({ title: 'Branch Protostomia', wikiLink: '/wiki/Protostomia' }),
  r.tag('Infrakingdom/lophozoa').path('/animalia/bilateria/protostomia/lophozoa').extra({ title: 'Infrakingdom Lophozoa', wikiLink: '/wiki/Lophotrochozoa' }),
  r.tag('Superphylum/polyzoa').path('/animalia/bilateria/protostomia/lophozoa/polyzoa').extra({ title: 'Superphylum Polyzoa', wikiLink: '/wiki/Bryozoa' }),
  r.tag('Phylum/bryozoa').path('/animalia/bilateria/protostomia/lophozoa/polyzoa/bryozoa').extra({ title: 'Phylum Bryozoa', wikiLink: '/wiki/Bryozoa' }),
  r.tag('Phylum/kamptozoa').path('/animalia/bilateria/protostomia/lophozoa/polyzoa/kamptozoa').extra({ title: 'Phylum Kamptozoa', wikiLink: '/wiki/Kamptozoa' }),
  r.tag('Superphylum/conchozoa').path('/animalia/bilateria/protostomia/lophozoa/conchozoa').extra({ title: 'Superphylum Conchozoa', wikiLink: '/w/index.php?title=Conchozoa&action=edit&redlink=1' }),
  r.tag('Phylum/mollusca').path('/animalia/bilateria/protostomia/lophozoa/conchozoa/mollusca').extra({ title: 'Phylum Mollusca', wikiLink: '/wiki/Mollusca' }),
  r.tag('Phylum/brachiozoa').path('/animalia/bilateria/protostomia/lophozoa/conchozoa/brachiozoa').extra({ title: 'Phylum Brachiozoa', wikiLink: '/wiki/Brachiozoa' }),
  r.tag('Superphylum/sipuncula').path('/animalia/bilateria/protostomia/lophozoa/sipuncula').extra({ title: 'Superphylum Sipuncula', wikiLink: '/wiki/Sipuncula' }),
  r.tag('Phylum/sipuncula').path('/animalia/bilateria/protostomia/lophozoa/sipuncula/sipuncula').extra({ title: 'Phylum Sipuncula', wikiLink: '/wiki/Sipuncula' }),
  r.tag('Superphylum/vermizoa').path('/animalia/bilateria/protostomia/lophozoa/vermizoa').extra({ title: 'Superphylum Vermizoa', wikiLink: '/w/index.php?title=Vermizoa&action=edit&redlink=1' }),
  r.tag('Phylum/nemertina').path('/animalia/bilateria/protostomia/lophozoa/vermizoa/nemertina').extra({ title: 'Phylum Nemertina', wikiLink: '/wiki/Nemertea' }),
  r.tag('Phylum/annelida').path('/animalia/bilateria/protostomia/lophozoa/vermizoa/annelida').extra({ title: 'Phylum Annelida', wikiLink: '/wiki/Annelida' }),
  r.tag('Infrakingdom/chaetognathi').path('/animalia/bilateria/protostomia/chaetognathi').extra({ title: 'Infrakingdom Chaetognathi', wikiLink: '/wiki/Chaetognatha' }),
  r.tag('Phylum/chaetognatha').path('/animalia/bilateria/protostomia/chaetognathi/chaetognatha').extra({ title: 'Phylum Chaetognatha', wikiLink: '/wiki/Chaetognatha' }),
  r.tag('Infrakingdom/ecdysozoa').path('/animalia/bilateria/protostomia/ecdysozoa').extra({ title: 'Infrakingdom Ecdysozoa', wikiLink: '/wiki/Ecdysozoa' }),
  r.tag('Superphylum/nemathelminthes').path('/animalia/bilateria/protostomia/ecdysozoa/nemathelminthes').extra({ title: 'Superphylum Nemathelminthes', wikiLink: '/wiki/Nematode' }),
  r.tag('Phylum/nemathelminthes').path('/animalia/bilateria/protostomia/ecdysozoa/nemathelminthes/nemathelminthes').extra({ title: 'Phylum Nemathelminthes', wikiLink: '/wiki/Nematode' }),
  r.tag('Superphylum/haemopoda').path('/animalia/bilateria/protostomia/ecdysozoa/haemopoda').extra({ title: 'Superphylum Haemopoda', wikiLink: '/wiki/Panarthropoda' }),
  r.tag('Phylum/lobopoda').path('/animalia/bilateria/protostomia/ecdysozoa/haemopoda/lobopoda').extra({ title: 'Phylum Lobopoda', wikiLink: '/wiki/Lobopoda' }),
  r.tag('Phylum/arthropoda').path('/animalia/bilateria/protostomia/ecdysozoa/haemopoda/arthropoda').extra({ title: 'Phylum Arthropoda', wikiLink: '/wiki/Arthropoda' }),
  r.tag('Infrakingdom/platyzoa').path('/animalia/bilateria/protostomia/platyzoa').extra({ title: 'Infrakingdom Platyzoa', wikiLink: '/wiki/Platyzoa' }),
  r.tag('Phylum/platyhelminthes').path('/animalia/bilateria/protostomia/platyzoa/platyhelminthes').extra({ title: 'Phylum Platyhelminthes', wikiLink: '/wiki/Platyhelminthes' }),
  r.tag('Phylum/acanthognatha').path('/animalia/bilateria/protostomia/platyzoa/acanthognatha').extra({ title: 'Phylum Acanthognatha', wikiLink: '/wiki/Acanthognatha' }),
  r.tag('Branch/deuterostomia').path('/animalia/bilateria/deuterostomia').extra({ title: 'Branch Deuterostomia', wikiLink: '/wiki/Deuterostomia' }),
  r.tag('Infrakingdom/coelomopora').path('/animalia/bilateria/deuterostomia/coelomopora').extra({ title: 'Infrakingdom Coelomopora', wikiLink: '/wiki/Ambulacraria' }),
  r.tag('Phylum/echinodermata').path('/animalia/bilateria/deuterostomia/coelomopora/echinodermata').extra({ title: 'Phylum Echinodermata', wikiLink: '/wiki/Echinoderm' }),
  r.tag('Phylum/hemichordata').path('/animalia/bilateria/deuterostomia/coelomopora/hemichordata').extra({ title: 'Phylum Hemichordata', wikiLink: '/wiki/Hemichordata' }),
  r.tag('Infrakingdom/chordonia').path('/animalia/bilateria/deuterostomia/chordonia').extra({ title: 'Infrakingdom Chordonia', wikiLink: '/wiki/Chordata' }),
  r.tag('Phylum/urochorda').path('/animalia/bilateria/deuterostomia/chordonia/urochorda').extra({ title: 'Phylum Urochorda', wikiLink: '/wiki/Tunicata' }),
  r.tag('Phylum/chordata').path('/animalia/bilateria/deuterostomia/chordonia/chordata').extra({ title: 'Phylum Chordata', wikiLink: '/wiki/Chordata' }),
  r.tag('Subkingdom/mesozoa').path('/animalia/mesozoa').extra({ title: 'Subkingdom Mesozoa', wikiLink: '/wiki/Mesozoa' }),
  r.tag('Phylum/mesozoa').path('/animalia/mesozoa/mesozoa').extra({ title: 'Phylum Mesozoa', wikiLink: '/wiki/Mesozoa' })
]);


export type RouteOut = typeof parser['_O'];
export type RouteIn = typeof parser['_I'];


interface State {
  breadcrumbs: RouteOut[];
  pending: boolean;
  text: string;
}


interface ExpandFlags {
  [k: string]: ExpandFlags|true;
}


class Application extends React.Component<{}, State> {
  unlisten: Function|null = null;

  constructor(props) {
    super(props);
    const breadcrumbs = this.parseLocation(window.location);
    this.state = { breadcrumbs, text: '', pending: true };
    this.fetchContent(breadcrumbs[0])
        .then(text => this.setState({ text, pending: false }))
        .catch(() => this.setState({ pending: false }));
  }

  componentDidMount() {
    const prevValue = window.onpopstate;
    window.onpopstate = this.handlePopState;
    this.unlisten = () => (window.onpopstate = prevValue);
  }

  componentWillUnmount() {
    this.unlisten && this.unlisten();
  }

  handlePopState = () => {
    const breadcrumbs = this.parseLocation(window.location);
    this.setState({ breadcrumbs, pending: true });
    
    this.fetchContent(breadcrumbs[0])
        .then(text => this.setState({ text, pending: false }))
        .catch(() => this.setState({ pending: false }));
  };

  parseLocation(location: Location): RouteOut[] {
    const path = !location.hash ? '' : location.hash[0] === '#' ? location.hash.slice(1) : location.hash;
    const breadcrumbs = parser.parseAll(path);
    const routeNotFound: RouteOut = parser.parse(parser.print({ tag: 'Home' }))!;
    return breadcrumbs.length ? breadcrumbs : [routeNotFound];
  }

  renderBreadcrumbs() {
    const { breadcrumbs } = this.state;
    return intersperse(breadcrumbs.map((r, idx) => <a key={idx} href={'#' + parser.print(r)}>{r.title}</a>).reverse(), <span> → </span>);

    function intersperse(xs: React.ReactElement<any>[], x: React.ReactElement<any>): React.ReactElement<any>[] {
      return xs.reduce<React.ReactElement<any>[]>((acc, a, idx) => (idx && acc.push(React.cloneElement(x, { key: 'glue-' + idx })), acc.push(a), acc), []);
    }
  }

  fetchContent(route: RouteOut): Promise<string> {
    if ('wikiLink' in route) return fetchWikiContent(route.wikiLink);
    else return Promise.resolve(readme);
  }

  render() {
    const { text: __html, pending, breadcrumbs } = this.state;
    
    return <div className={classes.root}>
      <div className={classes.columns}>
        <LifeTreeMenu className={classes.menu} route={this.state.breadcrumbs[0]}/>
        <div className={classes.right}>
          <Breadcrumbs embeddedClassName={classes.breadcrumbs} breadcrumbs={breadcrumbs}/>
          <div className={classes.wiki} dangerouslySetInnerHTML={{ __html }}/>
          {pending && <Spinner className={classes.spinner} overlay/>}
        </div>
      </div>
    </div>;
  }
}


function fetchWikiContent(wikiLink: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('error', e => reject(e));
    xhr.addEventListener('timeout', e => reject(e));
    xhr.addEventListener('load', () => {
      const jsonString = xhr.response || xhr.responseText;
      try {
        const json = JSON.parse(jsonString);
        const wikiText = processWikiContent(json.parse.text['*']);
        resolve(wikiText);
      } catch (e) {
        reject(e);
      }
    });
    xhr.withCredentials = false;
    xhr.timeout = 15_000;
    try {
      xhr.open('GET', 'https://cors-anywhere.herokuapp.com/'+ encodeURI(`https://en.wikipedia.org/w/api.php?action=parse&prop=text&redirects&mobileformat&section=0&page=${wikiLink.split('/')[2]}&format=json`), true);
      xhr.send();
    } catch (e) {
      reject(e);
    }
  });

}


/** Redirect relative links to https://wikipedia.org/ */
function processWikiContent(htmlString: string): string {
  const html = createElementFromHTML(htmlString); if (!html) return htmlString;
  const links = html.querySelectorAll('a');
  for (let i = 0; i < links.length; i++) {
    const el = links[i] as HTMLAnchorElement;
    if (el.attributes['href'].value.startsWith('/wiki/')) {
      el.attributes['href'].value = 'https://wikipedia.org' + el.attributes['href'].value;
      el.target = '_blank';
    }
  }
  return html.outerHTML;

  // https://stackoverflow.com/a/494348
  function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes
    return div.firstChild as HTMLElement|null; 
  }
}


// styles
export const styles = function () {
  const { spacing: { unit }, toolbar } = theme;
  return {
    root: {
      height: '100%',
      '& pre': {
        borderLeft: 'solid 4px rgba(0,0,0,0.08)',
        padding: [0, 0, 0, unit * 2],
        '& code': {
          background: 'initial',
        },
      },
      '& code': {
        background: 'rgba(0,0,0,0.06)',
        padding: [2, 3],
        borderRadius: 1.5,
      },
    },

    breadcrumbs: {
      marginBottom: unit * 3,
    },

    columns: {
      height: '100%',
      width: '100%',
      display: 'flex',
      '& > *:first-child': {
        flex: `0 0 ${unit * 32}px`,
      },
      '& > *:first-child + *': {
        flex: `10 10 auto`,
        padding: [unit * 2, unit * 3],
        boxSizing: 'border-box',
      },
    },
    
    menu: {
      background: 'rgba(0,0,0,0.022)',
      borderRight: 'solid 1px rgba(0,0,0,0.12)',
      height: '100%',
      boxSizing: 'border-box',
      padding: unit * 2,
      overflow: 'auto',
    },

    wiki: {
      ...linkStyle,
      fontSize: 14,
      '& .infobox': { float: 'right', margin: [unit * 2, 0, unit * 2, unit * 2] },
    },

    right: {
      height: '100%',
      position: 'relative',
      overflowY: 'scroll',
      '& p': { lineHeight: '1.3em', }
    },
    
    '@global': {
      'html, body': {
        margin: 0,
        padding: 0,
      },

      'html, body, body > div': {
        height: '100%',
      },
      
      'body, body': {
        fontFamily: '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
      },
    }
  };
}();
const { classes } = jss.createStyleSheet(styles).attach();

const init = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  ReactDOM.render(<Application/>, container);
};

document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);
