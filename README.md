meteor-roles v3
===============
[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
![GitHub](https://img.shields.io/github/license/Meteor-Community-Packages/meteor-roles)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![CodeQL](https://github.com/Meteor-Community-Packages/meteor-roles/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Meteor-Community-Packages/meteor-roles/actions/workflows/github-code-scanning/codeql)
![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/Meteor-Community-Packages/meteor-roles?label=latest&sort=semver)
[![](https://img.shields.io/badge/semver-2.0.0-success)](http://semver.org/spec/v2.0.0.html) 

Authorization package for Meteor - compatible with built-in accounts package.

There are also older versions of this package:
* [v1](https://github.com/Meteor-Community-Packages/meteor-roles/tree/v1)
* [v2](https://github.com/Meteor-Community-Packages/meteor-roles/tree/v2)
* [v3](https://github.com/Meteor-Community-Packages/meteor-roles/tree/v3)

<br />

<a id="roles-toc" name="roles-toc"></a>
## Table of Contents
- [meteor-roles v3](#meteor-roles-v3)
  - [Table of Contents](#table-of-contents)
  - [Contributors](#contributors)
  - [Authorization](#authorization)
  - [Permissions vs roles  (or What's in a name...)](#permissions-vs-roles--or-whats-in-a-name)
  - [What are "scopes"?](#what-are-scopes)
  - [Changes to default Meteor behavior](#changes-to-default-meteor-behavior)
  - [Installing](#installing)
  - [Migration to 3.0](#migration-to-30)
    - [Changes between 2.x and 3.0](#changes-between-2x-and-30)
  - [Usage Examples](#usage-examples)
  - [API Docs](#api-docs)
  - [Example Apps](#example-apps)
  - [Contributions, development and tests](#contributions-development-and-tests)

<br />


<a id="roles-contributors" name="roles-contributors"></a>
## Contributors

Thanks to:

  * [@storytellerCZ](https://github.com/sponsors/StorytellerCZ)
  * [@jankapunkt](https://github.com/sponsors/jankapunkt)
  * [@alanning](https://github.com/alanning)
  * [@mitar](https://github.com/mitar)
  * [@challett](https://github.com/challett)
  * [@ianserlin](https://github.com/ianserlin)
  * [@leebenson](https://github.com/leebenson)
  * [@pward123](https://github.com/pward123)
  * [@dandv](https://github.com/dandv)
  * [@aldeed](https://github.com/aldeed)
  * [@kevb](https://github.com/kevb)
  * [@zimme](https://github.com/zimme)
  * [@danieljonce](https://github.com/danieljonce)
  * [@pascoual](https://github.com/pascoual)
  * [@nickmoylan](https://github.com/nickmoylan)
  * [@mcrider](https://github.com/mcrider)
  * [@simonsimcity](https://github.com/simonsimcity)

<br />


<a id="roles-authorization" name="roles-authorization"></a>
## Authorization

This package lets you attach roles to a user, which you can then check against later when deciding whether to grant
access to Meteor methods or publish data. The core concept is very simple, essentially you are creating an assignment
of roles to a user and then checking for the existence of those roles later. This package provides helper methods
to make the process of adding, removing, and verifying those roles easier.

<br />

<a id="roles-naming" name="roles-naming"></a>
## Permissions vs roles  (or What's in a name...)

Although the name of this package is `roles`, you can define your **roles**, **scopes** or **permissions** however you like.
They are essentially just tags that you assign to a user and which you can check upon later.

You can have traditional roles like, `admin` or `webmaster`, or you can assign more granular permissions such
as, `view-secrets`, `users.view`, or `users.manage`.  Often, more granular is actually better because you are
able to handle all those pesky edge cases that come up in real-life usage without creating a ton of higher-level
`roles`.  With the `roles` package, it's all just a role object.

Roles can be put into a **hierarchy**.
Roles can have multiple parents and can be children (subroles) of multiple roles.
If a parent role is set to the user, all its descendants are also applying.
You can use this to create "super roles" aggregating permissions all the way through the bottom of the tree.
For example, you could name two top-level roles `user` and `admin` and then you could use your second-level roles as permissions and name them `USERS_VIEW`, `POST_EDIT`, and similar.
Then you could set `admin` role as parent role for `USERS_VIEW` and `POST_EDIT`, while `user` would be parent
only of the `POST_EDIT` role. You can then assign `user` and `admin` roles to your users. And if you need to
change permissions later for the whole role, just add or remove children roles. You can create roles from this example
with:

```javascript
import { Roles } from 'meteor/alanning:roles';

Roles.createRoleAsync('user');
Roles.createRoleAsync('admin');
Roles.createRoleAsync('USERS_VIEW');
Roles.createRoleAsync('POST_EDIT');
Roles.addRolesToParentAsync('USERS_VIEW', 'admin');
Roles.addRolesToParentAsync('POST_EDIT', 'admin');
Roles.addRolesToParentAsync('POST_EDIT', 'user');
```

<br />

<a id="roles-scopes" name="roles-scopes"></a>
## What are "scopes"?

Sometimes it is useful to let a user have independent sets of roles. The `roles` package calls these independent
sets "scopes" for lack of a better term. You can use them to represent various communities inside your
application. Or maybe your application supports [multiple tenants](https://en.wikipedia.org/wiki/Multitenancy).
You can put each of those tenants into their own scope. Alternatively, you can use scopes to represent
various resources you have.

Users can have both scope roles assigned, and global roles. Global roles are in effect for all scopes.
But scopes are independent of each other. Users can have one set of roles in scope A and another set
of roles in scope B. Let's go through an example of this using soccer/football teams as scopes.

```javascript
Roles.addUsersToRolesAsync(joesUserId, ['manage-team','schedule-game'], 'manchester-united.com');
Roles.addUsersToRolesAsync(joesUserId, ['player','goalie'], 'real-madrid.com');

Roles.userIsInRoleAsync(joesUserId, 'manage-team', 'manchester-united.com'); // true
Roles.userIsInRoleAsync(joesUserId, 'manage-team', 'real-madrid.com'); // false
```

In this example, we can see that Joe manages Manchester United and plays for Real Madrid. By using scopes, we can
assign roles independently and make sure that they don't get mixed up between scopes.

Now, let's take a look at how to use the global roles. Say we want to give Joe permission to do something across
all of our scopes. That is what the global roles are for:

```javascript
Roles.addUsersToRolesAsync(joesUserId, 'super-admin', null); // Or you could just omit the last argument.

const isInRole = await Roles.userIsInRoleAsync(joesUserId, ['manage-team', 'super-admin'], 'real-madrid.com')
if (isInRole) {
  // True! Even though Joe doesn't manage Real Madrid, he has
  // a 'super-admin' global role so this check succeeds.
}
```

<br />

<a id="roles-changes" name="roles-changes"></a>
## Changes to default Meteor behavior

  1. A new collection `Meteor.roleAssignment` contains the information about which role has been assigned to which user.
  1. A new collection `Meteor.roles` contains a global list of defined role names.
  1. All existing roles are automatically published to the client.

<br />

<a id="roles-installing" name="roles-installing"></a>
## Installing

1. Add one of the built-in accounts packages so the `Meteor.users` collection exists. From a command prompt:
    ```bash
    meteor add accounts-password
    ```

1. Add this package to your project. From a command prompt:
    ```bash
    meteor add alanning:roles
    ```

1. Publish the role assignments you need to the client:
    ```js
    Meteor.publish(null, function () {
      if (this.userId) {
        return Meteor.roleAssignment.find({ 'user._id': this.userId });
      } else {
        this.ready()
      }
    })
    ```

1. Run your application:
    ```bash
    meteor
    ```

<br />

<a id="roles-migration" name="roles-migration"></a>
## Migration to 4.0

If you are currently using this package in a version older than 3.6, please upgrade to 3.6 and follow all the steps described for previous major version upgrades.
Make sure to stay on 3.x until you have run the migration scripts as those are no longer available in version 4.

Before upgrading to version 4 make sure that all your server side roles call use the async versions of the functions.

Here is a full list of new async functions:
  * createRoleAsync
  * deleteRoleAsync
  * renameRoleAsync
  * addRolesToParentAsync
  * removeRolesFromParentAsync
  * addUsersToRolesAsync
  * setUserRolesAsync
  * removeUsersFromRolesAsync
  * userIsInRoleAsync
  * getRolesForUserAsync
  * getUsersInRoleAsync
  * getGroupsForUserAsync
  * getScopesForUserAsync
  * renameScopeAsync
  * removeScopeAsync
  * isParentOfAsync

> NOTE: The sync version of these functions are still available on the client.

## Migration to 3.0

If you are currently using this package in a version older than 2.x, please upgrade to 2.0 by running the migration script required there: https://github.com/Meteor-Community-Packages/meteor-roles/tree/v2#migration-to-20

In meteor-roles 3.0, functions are mostly backwards compatible with 2.x, but roles are stored differently in the database. Please take a backup of the `users` collection before migrating. To migrate the database to the new schema, run `Meteor._forwardMigrate2()` on the server:

```bash
meteor shell
> Package['alanning:roles'].Roles._forwardMigrate2()
```

In case something fails, there is also a script available for rolling back the changes. But be warned that a backward migration takes a magnitude longer than a forward migration. To migrate the database back to the old schema, run `Meteor._backwardMigrate2()` on the server:

```bash
meteor shell
> Package['alanning:roles'].Roles._backwardMigrate2()
```

### Changes between 2.x and 3.0

Here is the list of important changes between meteor-roles 2.x and 3.0 to consider when migrating to 3.0:

* Role assignments have been moved from the `users` documents to a separate collection called `role-assignment`, available at `Meteor.roleAssignment`.
* Role assignments are not published automatically. If you want all your role-assignments to be published automatically, please include the following code:
```js
Meteor.publish(null, function () {
  if (this.userId) {
    return Meteor.roleAssignment.find({ 'user._id': this.userId });
  } else {
    this.ready()
  }
})
```
* [BC] The behavior of `getRolesForUser()` used with the option `fullObjects` changed. [In case you need the old behavior ...](https://github.com/Meteor-Community-Packages/meteor-roles/pull/276/commits/41d2ed493852f21cf508b5b0b76e4f8a09ae8f5c#diff-b2ab7f7879884835e55802c6a35ee27e)
* Added option `anyScope` to `removeUsersFromRoles()`
* Add option `onlyScoped` to `getRolesForUser()` to allow limiting the result to only scoped permissions
* All functions (excepted for those listed above) work with 2.x arguments, but in 3.x accept extra arguments and/or options.
* Details and reasoning can be found in [#276](https://github.com/Meteor-Community-Packages/meteor-roles/pull/276)

<br />


<a id="roles-usage" name="roles-usage"></a>
## Usage Examples

<br />

Here are some potential use cases:

<br />

-- **Server** --


Add users to roles:
```js
var users = [
      {name:"Normal User",email:"normal@example.com",roles:[]},
      {name:"View-Secrets User",email:"view@example.com",roles:['view-secrets']},
      {name:"Manage-Users User",email:"manage@example.com",roles:['manage-users']},
      {name:"Admin User",email:"admin@example.com",roles:['admin']}
    ];

for (const user of users) {
  var id;

  id = await Accounts.createUserAsync({
    email: user.email,
    password: "apple1",
    profile: { name: user.name }
  });

  const count = await Meteor.roleAssignment.coundDocuments({ 'user._id': id })
  if (count === 0) {
    import { Roles } from 'meteor/alanning:roles';
    
    for (const role of user.roles)  {
      Roles.createRoleAsync(role, {unlessExists: true});
    }
    // Need _id of existing user record so this call must come after `Accounts.createUser`.
    Roles.addUsersToRolesAsync(id, user.roles);
  }

}
```

<br />
Note that the `Roles.addUsersToRoles` call needs to come _after_ `Accounts.createUser` or else
the roles package won't be able to find the user record (since it hasn't been created yet).
You can use `postSignUpHook` to assign roles when using
[user accounts package](https://github.com/meteor-useraccounts/core).
This SO answer gives more detail: http://stackoverflow.com/a/22650399/219238

<br />

Check user roles before publishing sensitive data:
```js
// server/publish.js
import { Roles } from 'meteor/alanning:roles'

// Give authorized users access to sensitive data by scope
Meteor.publish('secrets', async function (scope) {
  check(scope, String);

  const isInRole = await Roles.userIsInRoleAsync(this.userId, ['view-secrets','admin'], scope)
  if (isInRole) {
    
    return Meteor.secrets.find({scope: scope});
    
  } else {

    // user not authorized. do not publish secrets
    this.stop();
    return;

  }
});
```

<br />

Prevent non-authorized users from creating new users:
```js
Accounts.validateNewUser(async function (user) {
  import { Roles } from 'meteor/alanning:roles'
  
  var loggedInUser = Meteor.user();

  const isInRole = await Roles.userIsInRoleAsync(loggedInUser, ['admin','manage-users'])
  if () {
    return true;
  }

  throw new Meteor.Error('unauthorized', "Not authorized to create new users");
});
```

<br />

Prevent access to certain functionality, such as deleting a user:
```js
// server/userMethods.js
import { Roles } from 'meteor/alanning:roles'

Meteor.methods({
  /**
   * Revokes roles for a user in a specific scope.
   * 
   * @method revokeUser
   * @param {String} targetUserId ID of user to revoke roles for.
   * @param {String} scope Company to update roles for.
   */
  revokeUser: async function (targetUserId, scope) {
    check(targetUserId, String);
    check(scope, String);
  
    const loggedInUser = Meteor.user();

    const isInRole = await Roles.userIsInRole(loggedInUser, ['manage-users', 'support-staff'], scope);
    if (!loggedInUser || !isInRole) {
      throw new Meteor.Error('access-denied', "Access denied")
    }

    // remove roles for target scope
    Roles.setUserRolesAsync(targetUserId, [], scope)
  }
})
```

<br />

Manage a user's roles:
```js
// server/userMethods.js
import { Roles } from 'meteor/alanning:roles'

Meteor.methods({
  /**
   * Update a user's roles.
   *
   * @param {Object} targetUserId Id of user to update.
   * @param {Array} roles User's new roles.
   * @param {String} scope Company to update roles for.
   */
  updateRoles: async function (targetUserId, roles, scope) {
    check(targetUserId, String);
    check(roles, [String]);
    check(scope, String);

    const loggedInUser = Meteor.user();

    const isInRole = await Roles.userIsInRole(loggedInUser, ['manage-users', 'support-staff'], scope);
    if (!loggedInUser || !isInRole) {
      throw new Meteor.Error('access-denied', "Access denied");
    }

    Roles.setUserRolesAsync(targetUserId, roles, scope);
  }
})
```

<br />

-- **Client** --

Client JavaScript does not by default have access to all the same Roles functions as the server unless you publish
these role-assignments. In addition, Blaze will have the addition of a `isInRole` handlebars helper which is
automatically registered by the Roles package.

As with all Meteor applications, client-side checks are a convenience, rather than a true security implementation 
since Meteor bundles the same client-side code to all users. Providing the Roles functions client-side also allows
for latency compensation during Meteor method calls. Roles functions which modify the database should not be
called directly, but inside the Meteor methods.

NOTE: Any sensitive data needs to be controlled server-side to prevent unwanted disclosure. To be clear, Meteor sends
all templates, client-side JavaScript, and published data to the client's browser. This is by design and is a good thing.
The following example is just sugar to help improve the user experience for normal users. Those interested in seeing
the 'admin_nav' template in the example below will still be able to do so by manually reading the bundled `client.js`
file. It won't be pretty, but it is possible. But this is not a problem as long as the actual data is restricted server-side.

To check for global roles or when not using scopes:

```handlebars
<!-- client/myApp.html -->

<template name="header">
  ... regular header stuff
  {{#if isInRole 'admin'}}
    {{> admin_nav}}  
  {{/if}}
  {{#if isInRole 'admin,editor'}}
    {{> editor_stuff}}
  {{/if}}
</template>
```

To check for roles when using scopes:

```handlebars
<!-- client/myApp.html -->

<template name="header">
  ... regular header stuff
  {{#if isInRole 'admin,editor' 'group1'}}
    {{> editor_stuff}}  
  {{/if}}
</template>
```

<br />


<a id="roles-docs" name="roles-docs"></a>
## API Docs

Online API docs found here: https://meteor-community-packages.github.io/meteor-roles/

API docs generated using [YUIDoc](https://yui.github.io/yuidoc/)

To re-generate documentation:
  1. install YUIDoc
  2. `cd meteor-roles`
  3. `yuidoc`

To serve documentation locally:
  1. install YUIDoc
  2. `cd meteor-roles`
  3. `yuidoc --server 5000`
  4. point browser at http://localhost:5000/


<br />


<a id="roles-example-apps" name="roles-example-apps"></a>
## Example Apps

The `examples` directory contains Meteor apps which show off the following features:
* Server-side publishing with authorization to secure sensitive data
* Client-side navigation with link visibility based on user roles
* 'Sign-in required' app with up-front login page using `accounts-ui`
* Client-side routing

  1. `git clone https://github.com/Meteor-Community-Packages/meteor-roles.git`
  2. choose an example, eg.
    * `cd meteor-roles/examples/iron-router` or
    * `cd meteor-roles/examples/flow-router`
  3. `meteor`
  4. point browser to `http://localhost:3000`

<br />


<a id="roles-testing" name="roles-testing"></a>
## Contributions, development and tests

Please read our [contribution guidelines](./CONTRIBUTING.md),
which also describes how to set up and run the linter and tests.
