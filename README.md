# PlanOut

[PlanOut](http://facebook.github.io/planout/) is a system designed by Facebook to assist in running experiments in
applications.  This can be used to build your own A/B testing system.

This project is a TypeScript (and JavaScript) implemenation of PlanOut.

To run an A/B test or other experiment, you use the library to select values/variants
deterministically based on the a user ID or client ID.

This can also be used to rollout a feature to a subset of users and see whether
they experience additional errors as a result.

## Installation

    yarn add planout-ts
    
## Usage

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

## Documentation

There's API documentation describing all the generator functions available here:

* https://planout-ts.readthedocs.io/

## Making use of the results

Note that analyzing these results and making good decisions based on them can be pretty 
tricky and this library doesn't (yet) offer any assistance in the matter.

A good starting point for research on the matter might be [this blog](https://www.evanmiller.org/bayesian-ab-testing.html)

You may find it difficult or even impossible to actually use Google Analytics for this
purpose and instead you may wish to stream your analytics events into another service
that lets you keep and analyze all the events separately.
