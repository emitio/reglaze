# reglaze

[experimental] combines the ideas from redux, react-redux, redux-observable, and reselect into a bit of rxjs magic

Video introduction: [https://youtu.be/bERGGZghr0Q](https://youtu.be/bERGGZghr0Q)

Example "reglazer" function that returns the next state and rxjs side-effects

```javascript
const reglazer = (state, action, state$, action$) => {
  switch (action.kind) {
    case "LoginRequest":
      return [
        state,
        of({ kind: "LoginSuccess", username: action.username }).pipe(
          delay(1500),
          // cancel sending the LoginSuccess if another Login* action occurs while we're "processing" the login
          takeUntil(
            action$.pipe(
              filter(action => {
                switch (action.kind) {
                  case "LoginRequest":
                  case "LoginSuccess":
                  case "Logout":
                    return true;
                }
                return false;
              })
            )
          )
        )
      ];
    case "LoginSuccess":
      return [{ ...state, username: action.username }, empty()];
    case "Logout":
      return [{ ...state, username: null }, empty()];
  }
  return [state, empty()];
};
```

Example Stateless app enhanced via "connect"

```javascript
const App = props => {
  const { login, logout, username } = props;
  if (username) {
    return <h1 onClick={logout}>greetings {username}</h1>;
  }
  return (
    <h1
      onClick={() => {
        login("supershabam");
      }}
    >
      click to login after a cancellable delay
    </h1>
  );
};

const ConnectedApp = connect(
  App,
  // mapState$ToProps
  {
    username: state$ => {
      return state$.pipe(map(state => state.username));
    }
  },
  // mapDispatchToProps
  {
    login: username => {
      return { kind: "LoginRequest", username };
    },
    logout: () => {
      return { kind: "Logout" };
    }
  }
);
```
