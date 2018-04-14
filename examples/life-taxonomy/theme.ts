import jss from 'jss';
import preset from 'jss-preset-default';
jss.setup(preset());


const theme = function () {
  const colors = [
    [[13, 105, 204], [21, 97, 178]],
    [[255, 241, 48]],
    [[255, 58, 42], [178, 67, 58]],
  ];
  const base = colors[0][0];
  const palette = { first: colors[0][0], second: colors[1][1], colors };
  const spacing = { unit: 8 };
  const toolbar = { height: 30 + spacing.unit * 2 };
  return { spacing, toolbar, palette };
}();

export default theme;


/** Links */
export const linkStyle = {
  '& a': {
    color: `rgb(${theme.palette.colors[0][0].join(',')})`,
    textDecoration: 'none',
    borderBottom: `solid 1px rgba(${theme.palette.colors[0][0].join(',')}, 0.15)`,
    '&:hover': {
      color: `rgba(${theme.palette.colors[0][0].join(',')}, 0.75)`,
    },
    '&:active': {
      color: `rgb(${theme.palette.colors[2][0].join(',')})`,
      borderBottom: `solid 1px rgba(${theme.palette.colors[2][0].join(',')}, 0.54)`,
    },
  },
};
