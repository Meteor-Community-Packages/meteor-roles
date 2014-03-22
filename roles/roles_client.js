;(function () {

/**
 * Convenience functions for use on client.
 *
 * NOTE: You must restrict user actions on the server-side; any
 * client-side checks are strictly for convenience and must not be
 * trusted.
 *
 * @module HandlebarsHelpers
 */

////////////////////////////////////////////////////////////
// Handlebars helpers
//
// Use a semi-private variable rather than declaring Handlebars
// helpers directly so that we can unit test the helpers.
// XXX For some reason, the Handlebars helpers are not registered
// before the tests run.
//
Roles._uiHelpers = {

  /**
   * Handlebars helper to check if current user is in at least one
   * of the target roles.  For use in client-side templates.
   *
   * @example
   *     {{#if isInRole 'admin'}}
   *     {{/if}}
   *
   *     {{#if isInRole 'editor,user'}}
   *     {{/if}}
   *
   *     {{#if isInRole 'editor,user' 'group1'}}
   *     {{/if}}
   *
   * @method isInRole
   * @param {String} role Name of role or comma-seperated list of roles
   * @param {String} [group] Optional, name of group to check
   * @return {Boolean} true if current user is in at least one of the target roles
   * @static
   * @for HandlebarsHelpers
   */
  isInRole: function (role, group) {
    var user = Meteor.user(),
        comma = (role || '').indexOf(','),
        roles

    if (!user) return false
    if (!Match.test(role, String)) return false

    if (comma !== -1) {
      roles = _.reduce(role.split(','), function (memo, r) {
        if (!r || !r.trim()) {
          return memo
        }
        memo.push(r.trim())
        return memo
      }, [])
    } else {
      roles = [role]
    }

    if (Match.test(group, String)) {
      return Roles.userIsInRole(user, roles, group)
    }

    return Roles.userIsInRole(user, roles)
  }
}


if (typeof UI !== "undefined") {
  _.each(Roles._uiHelpers, function (func, name) {
    UI.registerHelper(name, func)
  })
} else {
  console.log('WARNING: Roles UI not registered. UI not defined')
}

}());
