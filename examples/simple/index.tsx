import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as r from '../../';


const parser = r.oneOf(
  r.tag('Shop').path('/shop'),
  r.tag('Category').path('/category').segment('slug', r.string).params({ page: r.nat.withDefault(1) }),
  r.tag('Item').path('/item').segment('id', r.string),
  r.tag('Page404').path('/404'),
);


/// type alias
type Route = typeof parser['_O'];


/// state
export interface State {
  history: Route[];
}


/// component
class Root extends React.Component<{}, State> {
  state: State = { history: [] };

  componentDidMount() {
    this.routeTransition();
    window.onpopstate = this.routeTransition;
  }

  routeTransition = () => {
    const notFoundRoute: Route = { tag: 'Page404' };
    const route = parser.parse(location.hash.slice(1)) || notFoundRoute;
    this.setState({ history: this.state.history.concat(route) });
  }

  makeLink(route: Route) {
    return <React.Fragment><a href={'#' + parser.print(route)}>{parser.print(route)}</a> <code>{JSON.stringify(route)}</code></React.Fragment>;
  }

  render() {
    return <div>
      <ul>
	<li>{this.makeLink({ tag: 'Shop' })}</li>
	<li>{this.makeLink({ tag: 'Category', slug: 'groceries', page: 1 })}</li>
	<li>{this.makeLink({ tag: 'Category', slug: 'groceries', page: 2 })}</li>
	<li>{this.makeLink({ tag: 'Item', id: '42' })}</li>
      </ul>
      <textarea
        rows={20}
        cols={60}
	value={this.state.history.map(x => JSON.stringify(x)).join('\n')}
      />
    </div>;
  }
}


const container = document.createElement('div');
document.body.appendChild(container);
ReactDOM.render(<Root/>, container);
