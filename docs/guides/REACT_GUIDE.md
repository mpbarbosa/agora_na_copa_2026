# React Guide

React is the primary UI framework for projects that use this document library
as reference.

This guide defines how to design, compose, and maintain React components and
application structure in a way that stays predictable, testable, and easy to
reason about — for both developers and AI-assisted tooling.

## Goal

Build UIs as a tree of small, focused components that each own one clear
responsibility. Keep data flow explicit, side effects isolated, and state as
local as correctness allows.

## What This Guide Covers

React applications are composed of components, hooks, and state. This guide
addresses how to structure them so that:

- each piece has a single, describable job
- data flows in one direction (props down, events up)
- side effects are contained and cleaned up
- state lives at the narrowest scope that satisfies correctness
- the component tree can be read, edited, and tested in isolation

## Why It Matters

1. Focused components are easier to rename, move, and delete without
   unintended breakage.
2. One-directional data flow makes the source of a UI state easy to trace.
3. Isolated side effects reduce the risk of memory leaks, stale closures, and
   race conditions.
4. Local state reduces the coordination overhead between distant parts of the
   tree.
5. Small components are independently renderable, which makes visual testing
   and unit testing straightforward.

## React and Code LLMs

React's component model is particularly well suited to LLM-assisted work when
components are kept small and explicit.

A code-focused model can reliably edit a component that owns one concern,
receives data through typed props, and emits events through explicit callbacks.
When state, side effects, and rendering logic are mixed into the same large
component, the model faces the same difficulties a human reviewer does: unclear
scope, hidden dependencies, and unpredictable change impact.

### Why LLMs Benefit

- Small components have narrow blast radius — a targeted edit rarely breaks
  unrelated behavior.
- Typed props make the component contract visible in local context.
- Explicit data flow means the model can trace where a value originates without
  reading the whole tree.
- Named custom hooks give side-effect logic a clear boundary and purpose.
- Predictable file structure lets the model locate the right file quickly.

### Where Common React Patterns Hurt LLMs

- Large components that fetch, transform, format, and render all in one place
  obscure the real responsibility.
- Overuse of `useEffect` for derived state or event handling creates implicit
  control flow the model can miss.
- Prop drilling through many layers makes it hard to infer where a value is
  mutated.
- Untyped or loosely typed props hide the expected shape of incoming data.
- Global mutable state shared across unrelated trees increases the surface of
  any edit.

## Required Rules

1. Each component renders one coherent UI concern.
2. Data flows down through props; events flow up through callback props.
3. Side effects live in `useEffect` with explicit dependency arrays and
   cleanup functions where needed.
4. State is placed at the narrowest scope where it must be shared.
5. Logic that does not produce JSX belongs in a hook, not in the render body.
6. Shared behavior is extracted into named custom hooks, not duplicated.
7. Derived values are computed from state rather than stored as redundant state.
8. Components do not reach outside their subtree for DOM nodes or sibling state.

## Positive Signals

- A component's job can be described in one sentence.
- Props are typed and have intention-revealing names.
- `useEffect` bodies are short, focused on one side effect, and include
  cleanup when required.
- State is collocated with the smallest subtree that needs it.
- Custom hooks have names that reflect their purpose, not their mechanics
  (e.g., `useOrderSummary`, not `useEffect2`).
- The JSX returned from a component is readable without expanding function
  definitions.
- A component can be rendered in isolation for testing or Storybook without
  mocking the entire application.

## Warning Signs

- A component file exceeds a few hundred lines with no extraction.
- A `useEffect` has more than two or three dependencies, or an empty
  dependency array that silences a linter warning.
- State is lifted multiple levels above the consumer "just in case".
- Logic that belongs in an event handler is written in `useEffect`.
- The same fetch or transform appears in multiple sibling components.
- Prop names reflect internal implementation details rather than the consuming
  component's semantics.
- A component imports another component's internal hook or internal state shape
  directly.

## Component Design

### Single Responsibility

Design each component around one user-visible concept or structural role.

Good split:
- `OrderSummary` — renders the summary of one order
- `OrderActions` — renders the available actions for an order
- `OrderPage` — composes both and fetches order data

Avoid:
- `OrderPanel` — fetches, renders, and handles submission logic in one body

### Props as the Component Contract

Props define the inputs a component expects. Keep them explicit and typed.

```tsx
interface ProductCardProps {
  name: string;
  price: number;
  imageUrl: string;
  onAddToCart: (productId: string) => void;
}

function ProductCard({ name, price, imageUrl, onAddToCart }: ProductCardProps) {
  return (
    <div>
      <img src={imageUrl} alt={name} />
      <p>{name}</p>
      <p>{price}</p>
      <button onClick={() => onAddToCart(name)}>Add to cart</button>
    </div>
  );
}
```

Avoid accepting an entire domain object as a prop when the component uses only
a few fields. Accept only what the component needs.

### Composition over Configuration

Prefer composing small components over adding props that switch internal
behavior.

```tsx
// Prefer
<Card>
  <CardHeader title="Summary" />
  <CardBody>{content}</CardBody>
  <CardFooter><SaveButton /></CardFooter>
</Card>

// Avoid
<Card
  title="Summary"
  content={content}
  footerType="save"
  showBorder
  compactMode
/>
```

The composed form lets each piece vary and be tested independently. The
configured form adds hidden coupling between the component and its consumer's
intentions.

## State Management

### Prefer Local State

Place state at the smallest scope where correctness allows it.

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

Lift state only when two or more sibling subtrees need to read or write the
same value.

### Derive, Don't Duplicate

Compute values from existing state instead of storing them as parallel state.

```tsx
// Correct
const [items, setItems] = useState<Item[]>([]);
const total = items.reduce((sum, item) => sum + item.price, 0);

// Avoid
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState(0); // stays out of sync
```

### When to Use External State

Use context or a dedicated state library only when:

- state must be shared across many levels of the component tree
- state belongs to the application session, not to a subtree (e.g.,
  authentication, user preferences)
- cache or server state needs coordination across multiple unrelated trees

Keep the number of external state slices proportional to what the application
actually needs.

## Hooks

### Rules of Hooks

1. Call hooks at the top level — never inside conditions, loops, or nested
   functions.
2. Call hooks only from function components or custom hooks.

### Custom Hooks for Reusable Logic

Extract any logic that needs React primitives but produces no JSX into a named
custom hook.

```tsx
function useOrderSummary(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOrder(orderId).then(data => {
      if (!cancelled) {
        setOrder(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [orderId]);

  return { order, loading };
}
```

Name hooks after the concept they represent, not the primitive they use.

### useEffect Discipline

`useEffect` is for synchronizing with something outside React — a network
request, a DOM subscription, a timer. It is not a general mechanism for
responding to state changes.

- Keep each `useEffect` focused on one side effect.
- Include all values read inside the effect in the dependency array.
- Return a cleanup function whenever the side effect allocates a resource.
- Do not use `useEffect` for derived state or for triggering other state
  updates in response to prop changes; compute derived values inline instead.

```tsx
// Correct — synchronized with an external subscription
useEffect(() => {
  const subscription = eventBus.subscribe("order-updated", handler);
  return () => subscription.unsubscribe();
}, [handler]);

// Avoid — deriving state in an effect
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// Correct — compute inline
const fullName = `${firstName} ${lastName}`;
```

## Data Fetching

Fetch data at the boundary closest to where it is consumed, not at the
application root.

A component that owns data fetching should:

1. Show a loading state while the request is in flight.
2. Handle the error case explicitly.
3. Clean up any in-flight request on unmount.

For most applications, prefer a dedicated data-fetching library (React Query,
SWR) over hand-rolled `useEffect` fetch patterns. These libraries handle
deduplication, caching, and cancellation consistently.

```tsx
// With React Query
function OrderSummary({ orderId }: { orderId: string }) {
  const { data: order, isPending, isError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
  });

  if (isPending) return <Spinner />;
  if (isError) return <ErrorMessage />;
  return <OrderDetails order={order} />;
}
```

## Performance

Optimize rendering only when a concrete problem exists. Measure before adding
`memo`, `useCallback`, or `useMemo`.

When optimization is justified:

- Wrap a component in `React.memo` when it is re-rendered frequently and its
  output is referentially stable given the same props.
- Wrap a callback in `useCallback` when it is passed to a memoized child or
  used as a `useEffect` dependency.
- Wrap an expensive computation in `useMemo` when it takes measurable time and
  its inputs are stable.

```tsx
// Justified: expensive transform with stable inputs
const sortedItems = useMemo(
  () => [...items].sort(compareFn),
  [items, compareFn]
);
```

Do not wrap every function and value in a memo primitive as a default.
Unnecessary memoization adds noise and can mask real performance problems.

## File and Folder Structure

Organize files around features, not technical layers.

```
src/
  features/
    orders/
      OrderPage.tsx          # route-level component
      OrderSummary.tsx
      OrderActions.tsx
      useOrderSummary.ts     # custom hook
      orderService.ts        # fetch/transform logic (no React)
  components/
    Button.tsx               # shared, generic UI component
    Card.tsx
```

Co-locate tests and styles with the component they relate to. Keep shared UI
primitives in a `components/` directory separate from feature-specific
components.

## Testing Guidance

Test behavior visible to the user, not implementation details.

- Render a component with realistic props and assert what the user would see
  or interact with.
- Prefer `@testing-library/react` — it encourages queries that reflect user
  intent (by role, label, text) rather than component internals.
- Test custom hooks with `renderHook` when their behavior is complex enough to
  warrant isolated tests.
- Do not assert on internal state or call internal handler functions directly.

```tsx
test("shows order total after load", async () => {
  renderWithProviders(<OrderSummary orderId="123" />);
  expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  await screen.findByText("$49.99");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
```

## Review Heuristics

### Responsibility Test

Can the component's purpose be described in one sentence without "and" or
"also"?

### Dependency Test

Can the component be rendered in isolation — in a test or Storybook — without
mocking the entire application?

### Effect Test

Does each `useEffect` have one clear external resource it synchronizes with?
If removing an effect leaves the UI unchanged, it may be unnecessary.

### State Scope Test

Is any piece of state lifted further than the nearest ancestor that has two
children that need it? If so, lower it.

### Re-render Test

If a parent re-renders, does a child re-render unnecessarily? Profile before
optimizing; do not add `memo` speculatively.

## Preferred Fixes

1. Split components that mix fetching, transformation, and rendering into
   separate components and a custom hook.
2. Move logic that uses no JSX out of the component body into a named custom
   hook or a plain function.
3. Replace redundant state with derived values computed inline.
4. Lower state that has been prematurely lifted to the smallest subtree that
   actually needs it.
5. Add cleanup functions to `useEffect` calls that open subscriptions, set
   timers, or start requests.
6. Replace effect-driven state derivations with inline computation or
   `useMemo`.

## Related Guides

- [MOBILE_FIRST_GUIDE.md](./MOBILE_FIRST_GUIDE.md)
- [HIGH_COHESION_GUIDE.md](./HIGH_COHESION_GUIDE.md)
- [LOW_COUPLING_GUIDE.md](./LOW_COUPLING_GUIDE.md)
- [UNIT_TEST_GUIDE.md](./UNIT_TEST_GUIDE.md)
- [CODE_QUALITY_CONTROL_GUIDE.md](./CODE_QUALITY_CONTROL_GUIDE.md)

## Summary Checklist

- [ ] Each component has one describable responsibility.
- [ ] Props are typed and carry only what the component needs.
- [ ] Data flows down through props; events flow up through callbacks.
- [ ] State is placed at the narrowest correct scope.
- [ ] Derived values are computed inline, not stored as parallel state.
- [ ] Each `useEffect` targets one external side effect and includes cleanup.
- [ ] Reusable logic is extracted into named custom hooks.
- [ ] Components can be rendered in isolation for testing.
- [ ] Performance primitives are added only after measuring a real problem.
- [ ] File structure groups by feature, not by technical layer.
