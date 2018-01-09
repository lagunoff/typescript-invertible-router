import * as React from 'react';
import jss from 'jss';
import { Country } from './CountryPage';
import { parser } from './';
import pageComponent from './Page';
import { CountryListItem, CountryBrief } from './SearchPage';


/// Data
export type Data = CountryBrief[];


/// Props
export interface Props {
  route: { region: 'Africa'|'Americas'|'Asia'|'Europe'|'Oceania' };
  data: Data;
}


/// State
export interface State {
}


/// component
@pageComponent()
class RegionPage extends React.Component<Props, State> {

  static initData(route: Props['route']): Promise<Data> {
    const url = `https://restcountries.eu/rest/v2/region/${encodeURIComponent(route.region)}?fields=name;alpha3Code;altSpellings;nativeName`;
    return fetch(url).then(r => r.ok ? r.json() : []);
  }

  render() {
    const { data, route } = this.props;
    return <div className={classes.root}>
      <h2>{route.region}</h2>
      <ul>
	{data.map(country => <CountryListItem key={country.alpha3Code} country={country}/>)}
      </ul>
    </div>;
  }
}
export default RegionPage;


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
};
const { classes } = jss.createStyleSheet(styles).attach();
