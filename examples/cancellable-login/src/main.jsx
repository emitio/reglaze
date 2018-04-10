import * as React from "react";
import * as ReactDOM from "react-dom";
import { createContext } from "../../../index.jsx";
import { empty, of } from "rxjs";
import { delay, filter, map, takeUntil } from "rxjs/operators";

const reglazer = (state, action, state$, action$) => {
  console.log("reglazer called", state, action, state$, action$);
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

// TODO figure out how to provide a global "connect" function that can find the appropriate
// Consumer at runtime to grab the context from
const { connect, Provider, Consumer } = createContext(reglazer, {
  username: null
});

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

ReactDOM.render(
  <Provider>
    <ConnectedApp />
  </Provider>,
  document.getElementById("app")
);
