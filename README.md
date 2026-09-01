# PlanOut

[PlanOut](https://github.com/facebookarchive/planout) is a system designed by Facebook to assist in running experiments in
applications.  This can be used to build your own A/B testing or gradual/partial feature
rollout system.

Facebook archived PlanOut and took down its documentation site, so this repo carries its
own [PlanOut language reference](LANGUAGE.md) describing the dialect implemented here.

This project is a TypeScript/JavaScript implemenation of PlanOut.

To run an A/B test or other experiment, you use the library to select values/variants
deterministically based on a user ID, client ID, or other factors.

This can also be used to rollout a feature to a subset of users and see whether
they experience additional errors as a result.

### Installation

    yarn add planout-ts
    
### Usage

When running an experiment, you use two pieces of information: 

1. the experiment name / ID, which is same for all users
2. a user / session / client identifier, which varies between users.  In this
   library we call this the `salt` for lack of a better word

The library helps you generate values that vary between users but will
always be the same for a given experiment & user combination, so a
user who returns to the application will see the same variant again
the next time.

If you are doing an experiment that affects users that are not logged in,
you will need to generate a client ID and store it on the client computer,
in localStorage, a cookie, or wherever, so you can use the same value again
later.

If the user will always be logged in when they are exposed to an experiment
you can use their user ID and whatever system you already use to manage that
should be fine.

Here's a rough example:

```typescript
import { experiment } from 'planout-ts';
import React from 'react';

// Get previous client id or generate a new one
const clientId = localStorage.clientId || (localStorage.clientId = [Date.now(), Math.floor(Math.random()*0xFFFFFFFF)].join('.'));

// Prepare experiment
const loginExperiment = experiment('login');
const loginVariant = loginExperiment.uniformChoice(['A', 'B'], clientId);

// Imaginary React component that uses this
class LoginControl extends React.Component {
  componentDidMount() {
    // Example of logging the event to Google Analytics
    ga('send', 'event', 'experiments', 'Login Page Loaded', `Variant ${loginVariant}`);        
  }

  render() {
    if(loginVariant === 'A') {
      // show A version
    } else {
      // show B version
    }  
  }
}
```

You should be able to create segments in your analytics database based on which
users triggered the event for each variant, and then compare the frequency of 
your desired outcome between the groups.

If you want to do some kind of multivariate testing you can call `uniformChoice` once for
each variable, and then combine the resulting variables together.  Just be aware
that `uniformChoice` always returns the same array index for the same experiment `name` &
`salt`, so you must vary at least one of these for each variable or the variables
will no be "mixed up" as intended.  Passing an array as the salt is the easiest way to
do that — `uniformChoice(['A', 'B'], [clientId, 'buttonColor'])`.

### Using PlanOut Scripts

Part of PlanOut is the PlanOut language.  You can read about the language here:

* [PlanOut language reference](LANGUAGE.md) — the dialect this package implements,
  including the operators supported, how assignment is hashed, and where this port
  differs from Facebook's
* [Facebook's original language docs](https://github.com/facebookarchive/planout/blob/master/python/docs/07-language.md)
  — background on the design, but written against the Python implementation

To use PlanOut scripts with this package, you must compile them to JSON, parse the
JSON to objects, and pass it to `execute`.  Provide an initial variable state
(especially anything you want to use as a `salt`, which is called `unit` in
the scripting language operations).

The script will assign any experiment variables / parameters and you can read
the calculated values by calling `get` on the experiment that is returned.

The idea behind the planout scripts is that you can make the system a bit more
abstract - the "knobs and levers" are the variables set by the PlanOut language
script, and the PlanOut language scripts are stored in some repository and
edited separately from the code.

The main use case I am aware of for this is that you can use it to allow the
experiment parameters to evolve dynamically without updating the application
code.  A feature can be added and distributed to internal testers.  Later,
some percentage of end users are exposed to the new feature.  Finally, 
the feature can be enabled for everyone - or disabled.

In this model the application provides various useful pieces of information
about the current user (if there is one) as part of the experiment input
variables, loads and runs compiled PlanOut scripts from the database, and 
then updates the user experience according to the variables set by the 
experiment scripts.

Here's a rough example using a script:

```typescript
import { compile, execute } from 'planout-ts';
import React from 'react';

// Get previous client id or generate a new one
const clientId = localStorage.clientId || (localStorage.clientId = [Date.now(), Math.floor(Math.random()*0xFFFFFFFF)].join('.'));

// Get the experiment code somehow, typically you would want to pre-compile this
// and ship it in the HTML page so it is available immediately to the code that
// depends on it
const code = compile(`variant = uniformChoice(choices=['A', 'B'], unit=clientId);`);

// Imaginary React component that uses this
class LoginControl extends React.Component {
  experiment = execute('login', code, { clientId });

  componentDidMount() {
    // Example of logging the event to Google Analytics
    if(this.experiment.enabled) {
      ga('send', 'event', 'experiments', 'Login Page Loaded', this.experiment.getParamsText());
    }        
  }

  render() {    
    if(this.experiment.get('variant') === 'B') {
      // show B version
    } else {
      // show A / default version
    }  
  }
}
```

#### Disabling experiments in the script

Note that if the experiment has a `return false;` then the experiment will
be marked as disabled.  In this case, the application should not use any
values set by the script in the experiment and should not log the experiment
exposure to analytics.

When disabled, the experiment `get` will always return the default argument
provided (`null` by default).  The hash is also forced to zero, so
`uniformChoice` returns the first item and `randomInteger` / `randomFloat`
return their minimum.

Be careful with the other random methods when disabled: a zero hash is below
every threshold, so `bernoulliTrial` returns `1` for any non-zero `p` and
`bernoulliFilter` keeps every choice.  Gate on `enabled` and read values through
`get` with an explicit default rather than relying on those return values.  See
[the language reference](LANGUAGE.md#behavior-when-an-experiment-is-disabled)
for the full table.

### API Documentation

Generated API docs: [dobesv.com/planout-ts](https://dobesv.com/planout-ts/)

* [PlanOutExperiment](https://dobesv.com/planout-ts/classes/PlanOutExperiment.html)
* [PlanOutInterpreter](https://dobesv.com/planout-ts/classes/PlanOutInterpreter.html)
* [PlanOutParameterGatherer](https://dobesv.com/planout-ts/classes/PlanOutParameterGatherer.html)
* [compile](https://dobesv.com/planout-ts/functions/compile.html) /
  [execute](https://dobesv.com/planout-ts/functions/execute.html) /
  [experiment](https://dobesv.com/planout-ts/functions/experiment.html) /
  [inspect](https://dobesv.com/planout-ts/functions/inspect.html)

### Making use of the results

Note that analyzing these results and making good decisions based on them can be pretty 
tricky and this library doesn't (yet) offer any assistance in the matter.

A good starting point for research on the matter might be [this blog](https://www.evanmiller.org/bayesian-ab-testing.html)

You may find it difficult or even impossible to actually use Google Analytics for this
purpose and instead you may wish to stream your analytics events into another service
that lets you keep and analyze all the events separately.

### Future Work

* PlanOut style namespace for mutually exclusive experiments selected at random
* `coalesce` (the `??` operator) and `switch` — both parse but throw
  `Unsupported op` when executed, since the interpreter has no implementation for them
* Per-variable salting, so two variables assigned from the same `unit` aren't
  perfectly correlated

### Development

Run the tests and the typecheck:

```sh
yarn test
```

Rebuild the jison parser, `dist/`, and the typedoc site under `docs/`:

```sh
yarn build
```

`src/parser.js` is generated from `src/planout.jison` but committed to the
repository, so run `yarn build:compiler` and commit the result whenever you
change the grammar. CI fails if the two are out of sync.

### Releasing

Releases are cut by changesets. Any pull request that changes behaviour should
include a changeset describing it:

```sh
yarn changeset
```

That writes a markdown file under `.changeset/` recording whether the change is
a patch, minor, or major. Commit it with the rest of your work.

Once the pull request merges, a bot opens or updates a pull request titled
"Version Packages" that applies the accumulated version bump and rewrites
`CHANGELOG.md`. Merging *that* pull request publishes to npm, tags the commit,
and creates the GitHub release. So nothing ships until you deliberately merge
the version pull request.

Publishing authenticates with npm [trusted
publishing](https://docs.npmjs.com/trusted-publishers), so there is no npm
token stored in this repository and nothing to rotate. npm accepts the release
job's short-lived OIDC token because `planout-ts` lists this repository and
`.github/workflows/release.yml` as a trusted publisher. If you rename or move
that workflow file, update the trusted publisher on npm to match or publishing
will start failing with an authentication error.

### History

Releases from 1.1.1 onward are recorded in
[CHANGELOG.md](CHANGELOG.md), which changesets maintains. The entries below
predate it.

### 1.1.0

Fix issue where `&&` and `||` did not stop evaluating early if the outcome was already determined.

### 1.0.0

Initial npm release
