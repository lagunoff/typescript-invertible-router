This demo shows how `Parser.prototype.parseAll` can be used to
implement simple «breadcrumbs» navigation strategy. `parseAll` differs
from `parse` by the fact that its result contain all variants that
were successfully matched against input, including those that left
some segments unconsumed.

```ts
const parser = r.oneOf(
  r.tag('Home').path('/'),
  r.tag('Shop').path('/shop'),
  r.tag('Item').path('/shop/item').segment('id', r.nestring),
);

console.log(parser.parse('/shop/item/42'));
// => { tag: 'Item', id: '42' }
console.log(parser.parseAll('/shop/item/42'));
// => [{ tag: 'Item', id: '42' }, { tag: 'Shop' }, { tag: 'Home' }]
console.log(parser.parseAll('/unknown-url'));
// => []
```

If the input didn't match any of the routes, method `parseAll` returns
empty array, otherwise the first element would be the best match (the
one that has less unconsumed segments), then the second best and so
on. In other words, the output has the reverse order compared to the
order breadcrumbs are usually displayed.

Since result of `parseAll` contains only successfully matched routes,
in order to make one route descendant from another, it has to have the
same segment prefix as the parent. This condition restricts the use of
`parseAll` only to the simple case when each descendant route has all
its parent segments.
