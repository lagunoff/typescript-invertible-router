import * as React from 'react';
import jss from 'jss';
import { Country } from './Country';
import { parser } from './';
import pageComponent from './Page';


/// Data
export type CountryBrief = Pick<Country, 'name'|'alpha2Code'|'altSpellings'|'nativeName'>;
export type Data = CountryBrief[];


/// Props
export interface Props {
  route: { search: string };
  data: Data;
}


/// State
export interface State {
}


/// component
@pageComponent((props: Props) => props.route.search)
class SearchPage extends React.Component<Props, State> {

  static initData(route: Props['route']): Promise<Data> {
    if (route.search === '') return Promise.resolve([]);
    const query = '?fields=name;alpha2Code';
    const url = `https://restcountries.eu/rest/v2/name/${encodeURIComponent(route.search)}?fields=name;alpha2Code;altSpellings;nativeName`;
    return fetch(url).then(r => r.ok ? r.json() : []);
  }

  render() {
    const { data, route } = this.props;
    return <div className={classes.root}>
      {data.length !== 0 && <React.Fragment>
	<h2>Found {data.length} {data.length === 1 ? 'country' : 'countries'}</h2>
	<ul>
	  {data.map(country => <CountryListItem key={country.alpha2Code} country={country}/>)}
	</ul>
      </React.Fragment>}
      {data.length === 0 && route.search !== '' && <div className={classes.notFound}>
	Found nothing
      </div>}
      {route.search === '' && <div className={classes.help}>
	Type a query in order to search for countries by their name
      </div>}
    </div>;
  }
}
export default SearchPage;


/// list item
export function CountryListItem(props: { country: CountryBrief }) {
  const { country } = props;
  return <li className={classes.listItem}>
    <div>
      <a href={'#' + parser.print({ tag: 'Country', code: country.alpha2Code })}>{country.name}, {country.nativeName}</a>
    </div>
    <div>
      {country.altSpellings.join(', ')}
    </div>
  </li>
}


/// styles
export const styles = {
  root: {
    '& ul': {
      margin: 0,
      padding: 0,
    },
  },

  input: {
    width: '100%',
  },

  listItem: {
    listStyle: 'none',
    '& + &': {
      marginTop: 16,
    },
    '& > *:first-child + *': {
      fontSize: 14,
    },
  },

  notFound: {
    margin: [24, 0],
    textAlign: 'center',
    fontSize: 14,
  },

  help: {
    margin: [24, 0],
    textAlign: 'center',
    fontSize: 14,
  },
};
const { classes } = jss.createStyleSheet(styles).attach();
