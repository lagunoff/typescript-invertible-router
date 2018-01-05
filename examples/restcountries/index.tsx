import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as r from '../react';
import { Parser, ParserChain } from '../../src/parser';
import { TotalAdapter, PartialAdapter } from '../../src/adapter';
import jss from 'jss'
import preset from 'jss-preset-default'
jss.setup(preset());
import 'whatwg-fetch';
import Spinner from './Spinner';
import HomePage from './HomePage';
import SearchPage from './SearchPage';
import CountryPage from './CountryPage';
import RegionPage from './RegionPage';


/// declare all possible routes
export const parser = r.oneOf(
  r.tag('Home').extra({ component: HomePage }),
  r.tag('Country').path('/countries').segment('code', r.nestring).extra({ component: CountryPage }),
  r.tag('Countries').path('/countries').params({ search: r.string.withDefault('') }).extra({ component: SearchPage }),
  r.tag('Region').path('/region').segment('region', r.literals('Africa', 'Americas', 'Asia', 'Europe', 'Oceania')).extra({ component: RegionPage }),
);


/// type aliases
export type RouteOut = typeof parser['_O'];
export type RouteIn = typeof parser['_I'];


/// state
interface State {
  pending: boolean;
  page: null | { route: RouteOut, data: any };
}


/// component
class Root extends React.Component<{}, State> {
  state: State = { pending: true, page: null };
  
  componentDidMount() {
    this.routeTransition();
    window.onpopstate = this.routeTransition;
  }

  routeTransition = () => {
    const notFoundRoute: RouteOut = { tag: 'Home', component: HomePage };
    const route = parser.parse(location.hash.slice(1)) || notFoundRoute;
    const component = route.component as any;
    this.setState({ pending: true });
    const prevData = this.state.page && this.state.page.route.tag === route.tag ? this.state.page.data : undefined;
    component.initData(route, prevData).then(data => this.setState({ pending: false, page: { route, data } }));
  }

  renderPendingOverlay() {
    return <div className={classes.pendingOverlay}>
      <Spinner className={classes.spinner}/>
    </div>;
  }

  render() {
    const { pending, page } = this.state;
    const Page = page ? page.route.component as any : undefined;
    return (
      <div className={classes.root}>
	{Page && page && <Page data={page.data} route={page.route}/>}
	{pending && this.renderPendingOverlay()}
      </div>
    );
  }
}


/// styles
export const styles = {
  root: {
  },

  pendingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(255,255,255,0.5)',
    zIndex: 100,
  },

  spinner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },

  '@global': {
    'html, body': {
      margin: 0,
      padding: 0,
    },
    
    'body, body': {
      fontFamily: '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
    },
    
    'a:link': {
      color: '#0089ff',
      textDecoration: 'none',
      borderBottom: '1px solid rgba(0,137,255,.3)',
      WebkitTransition: 'color .3s ease,border-color .3s ease',
      transition: 'color .3s ease,border-color .3s ease',
    },

    'a:visited': {
      color: '#b40eb4',
      borderColor: 'rgba(180,14,180,.3)',
    },

    'a:link:hover,a:visited:hover': {
      color: '#f41224',
      borderColor: 'rgba(244,18,36,.3)',
    },
  }
};
const { classes } = jss.createStyleSheet(styles).attach();


const container = document.createElement('div');
document.body.appendChild(container);
ReactDOM.render(<Root/>, container);
