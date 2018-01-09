import * as React from 'react';
import jss from 'jss';
import { parser } from './';


/// props
export interface Props {
  initialValue?: string;
}


/// state
export interface State {
  value: string;
}


/// component
export default class Search extends React.Component<Props, State> {

  constructor(props) {
    super(props);
    this.state = { value: props.initialValue || '' };
  }

  handleChange = e => {
    this.setState({ value: e.target['value'] })
  };

  handleSubmit = e => {
    e.preventDefault();
    window.location.href = '#' + parser.print({ tag: 'Search', search: this.state.value });
  };

  render() {
    const { value } = this.state;
    return (
      <form className={classes.root} onSubmit={this.handleSubmit}>
	<input
	  autoFocus
          type="text"
          placeholder="Search by name"
     	  value={value}
          onChange={this.handleChange}
	/>
	<button type="submit">Search</button>
      </form>
    );
  }
}


/// styles
export const styles = {
  root: {
    display: 'flex',
    '& > *': {
      height: 32,
      boxSizing: 'border-box',
    },
    '& > *:first-child': {
      flex: '10 10 auto',
    },
    '& > *:first-child + *': {
      flex: '0 0 auto',
    },
    '& input': {
      padding: [0, 8],
      fontSize: 20,
      position: 'relative',
      marginRight: -4,
      minWidth: 0,
      verticalAlign: 'middle',
      '&::placeholder': {
	fontSize: 14,
	fontWeight: 400,
	fontStyle: 'italic',
      },
    },
    '& button': {
      minWidth: 100,
      padding: [0, 16],
      fontSize: 14,
      textTransform: 'uppercase',
      zIndex: 10,
    },
  },
};
const { classes } = jss.createStyleSheet(styles).attach();
