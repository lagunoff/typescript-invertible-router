import * as React from 'react';
import jss from 'jss';
import pageComponent from './Page';
import { parser } from './';


/// Currency
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}


/// Language
export interface Language {
  iso639_1: string;
  iso639_2: string;
  name: string;
  nativeName: string;
}


/// Block
export interface Block {
  acronym: string;
  name: string;
  otherAcronyms: string[];
  otherNames: string;
}


/// Country
export interface Country {
  name: string;
  topLevelDomain: string[];
  alpha2Code: string;
  alpha3Code: string;
  callingCodes: string[];
  capital: string[];
  altSpellings: string[];
  region: string;
  subregion: string;
  population: number;
  latlng: [number, number];
  demonym: string;
  area: number;
  gini: number;
  timezones: string[];
  borders: string[];
  nativeName: string;
  numericCode: string;
  currencies: Currency[];
  languages: Language[];
  translations: Record<string, string>;
  flag: string;
  regionalBlocs: Block[];
  cioc: string;
}


/// Data
export type Data = Country;


/// Props
export interface Props {
  route: { code: string };
  data: Data;
}


/// State
export interface State {
}


/// component
@pageComponent()
class CountryPage extends React.Component<Props, State> {

  static initData(route: Props['route']): Promise<Data> {
    return fetch('https://restcountries.eu/rest/v2/alpha/' + encodeURIComponent(route.code)).then(r => r.json());
  }

  renderGoogleMapLink(latLng: [number, number]) {
    const href = `http://www.google.com/maps/place/${latLng[0]},${latLng[1]}/@${latLng[0]},${latLng[1]},5z`;
    return <a key={latLng.join('-')} href={href} target="_blank">Open in google maps</a>
  }

  render() {
    const { data } = this.props;
    return <div className={classes.root}>
      <h2>{data.name}</h2>
      <div className={classes.columns}>
	<div>
	  <table className={classes.summary}>
	    <tbody>
	      <tr>
		<td><b>Native name</b></td><td>{data.nativeName}</td>
	      </tr>
	      <tr>
		<td><b>Capital</b></td><td>{data.capital}</td>
	      </tr>
	      <tr>
		<td><b>Population</b></td><td>{groupingFormatter.format(data.population)}</td></tr>
	      <tr>
		<td><b>Area</b></td><td>{groupingFormatter.format(data.area)} km<sup>2</sup></td>
	      </tr>
	      <tr>
		<td><b>Region</b></td>
		<td><a href={'#' + parser.print({ tag: 'Region', region: data.region as any })}>{data.region}</a></td>
	      </tr>
	    </tbody>
	  </table>
	</div>
	<div>
	  <a href={data.flag} className={classes.flag}><img src={data.flag} alt="Flag"/></a>
	</div>
      </div>
      <table className={classes.details}>
	<tbody>
	  <tr>
	    <td>Alternative spelling</td>
	    <td>{data.altSpellings.join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Borders</td><td>{intersperse<any>(', ', data.borders.map(code => <a key={code} href={'#' + parser.print({ tag: 'Country', code })}>{code}</a>))}</td>
	  </tr>
	  <tr>
	    <td>Calling code</td><td>{data.callingCodes.join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Currencies</td><td>{data.currencies.map(x => x.name).join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Coordinates</td><td>{this.renderGoogleMapLink(data.latlng)}</td>
	  </tr>
	  <tr>
	    <td>Demonym</td><td>{data.demonym}</td>
	  </tr>
	  <tr>
	    <td>Languages</td><td>{data.languages.map(x => x.name).join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Numeric code</td><td>{data.numericCode}</td>
	  </tr>
	  <tr>
	    <td>Regional blocks</td><td>{data.regionalBlocs.map(x => x.name).join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Subregion</td><td>{data.subregion}</td>
	  </tr>
	  <tr>
	    <td>Timezones</td><td>{data.timezones.join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Domain</td><td>{data.topLevelDomain.join(', ')}</td>
	  </tr>
	  <tr>
	    <td>Translations</td><td>{Object.keys(data.translations).map(lang => <div key={lang}><b>{lang}</b> <span>{data.translations[lang]}</span></div>)}</td>
	  </tr>
	</tbody>
      </table>
    </div>;
  }
}
export default CountryPage;


/// styles
export const styles = {
  root: {
  },

  input: {
    width: '100%',
  },

  flag: {
    borderBottom: 'none !important',
    '& img': {
      maxWidth: '100%',
      maxHeight: '100%',
    }
  },

  columns: {
    display: 'flex',
    '& > *:first-child': {
      flex: '10 10 100%',
    },
    '& > *:first-child + *': {
      flex: '0 0 40%',
    },
  },

  summary: {
    borderCollapse: 'collapse',
    '& td:first-child': { textAlign: 'right', },
    '& td + td': { paddingLeft: 8, textAlign: 'left', },
    '& td': { lineHeight: '0.96', padding: [4, 0], fontSize: 14, },
  },

  details: {
    borderSpacing: 0,
    borderCollapse: 'collapse',
    width: '100%',
    marginTop: 24,
    '& td': {
      border: 'solid 1px rgba(0,0,0,0.06)',
      padding: [8, 16],
    },
  },
};
const { classes } = jss.createStyleSheet(styles).attach();


/// helper
function intersperse<A>(x: A, xs: A[]): A[] {
  return xs.reduce<any[]>((acc, a, idx) => (acc.push(a), idx !== xs.length - 1 && acc.push(x), acc), []);
}


/// formatter for big numbers
const groupingFormatter = typeof (Intl) !== 'undefined' ? new Intl.NumberFormat({ useGrouping: true } as any) : { format(x) { return x; } };
