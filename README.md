# PlanOut

[PlanOut](http://facebook.github.io/planout/) is a system designed by Facebook to assist in running experiments in
applications.  This can be used to build your own A/B testing or gradual/partial feature
rollout system.

This project is a TypeScript/JavaScript implemenation of PlanOut.

To run an A/B test or other experiment, you use the library to select values/variants
deterministically based on the a user ID, client ID, or other factors.

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

// Get previous client id or generate a new one
const clientId = localStorage.clientId || (localStorage.clientId = [Date.now(), Math.floor(Math.random()*0xFFFFFFFF)].join('.'));

// Prepare experiment
const loginExperiment = experiment('login');
const loginVariant = loginExperiment.choice(['A', 'B'], clientId);

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

If you want to do some kind of multivariate testing you can call `choice` once for
each variable, and then combine the resulting variables together.  Just be aware
that `choice` always returns the same array index for the same experiment `name` &
`salt`, so you must vary at least one of these for each variable or the variables
will no be "mixed up" as intended.

### Using PlanOut Scripts

Part of PlanOut is the PlanOut language.  You can read about the language here:

* https://facebook.github.io/planout/docs/planout-language.html

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

#### Disabling experiments in the script

Note that if the experiment has a `return false;` then the experiment will
be marked as disabled.  In this case, the application should not use any
values set by the script in the experiment and should not log the experiment
exposure to analytics.

When disabled, the experiment `get` will always return the default argument
provided (`null` by default) and the random selection methods will always
return zero, the first item, or the minimum value rather than applying the
hash function.

### API Documentation

There's API documentation describing all the generator functions available here:

* https://planout-ts.readthedocs.io/

### Making use of the results

Note that analyzing these results and making good decisions based on them can be pretty 
tricky and this library doesn't (yet) offer any assistance in the matter.

A good starting point for research on the matter might be [this blog](https://www.evanmiller.org/bayesian-ab-testing.html)

You may find it difficult or even impossible to actually use Google Analytics for this
purpose and instead you may wish to stream your analytics events into another service
that lets you keep and analyze all the events separately.

### Future Work

* PlanOut style namespace for mutually exclusive experiments selected at random
