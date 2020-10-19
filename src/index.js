const faunadb = require('faunadb'),
  q = faunadb.query;

class TeamRotationFauna {
  constructor({ faunaDbSecret }) {
    this.faunaDbSecret = faunaDbSecret;
    this.client = new faunadb.Client({ secret: this.faunaDbSecret });
  }

  async addTeam({ teamId, description }) {
    return this.client.query(
      q.Create(q.Collection('Teams'), {
        data: {
          team_id: teamId,
          description: description,
          active_member: '',
        },
      })
    );
  }

  async getTeam({ teamId }) {
    const ret = await this.client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('teams-by-team-id'), [teamId])),
        q.Lambda(
          ['ref', 'active_member', 'description'],
          [
            q.Select('id', q.Var('ref')),
            q.Var('active_member'),
            q.Var('description'),
          ]
        )
      )
    );
    if (ret.data.length) {
      return {
        team_ref_id: ret.data[0][0],
        active_member: ret.data[0][1],
        description: ret.data[0][2],
      };
    }
    return null;
  }

  async addTeamMember({ teamId, memberId, name }) {
    return this.client.query(
      q.Create(q.Collection('Members'), {
        data: {
          team_id: teamId,
          member_id: memberId,
          name,
          journeys: 0,
        },
      })
    );
  }

  async retrieveTeamMembers({ teamId }) {
    const ret = await this.client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('members-sorted-by-journeys'), [teamId])),
        q.Lambda(['journeys', 'member_id', 'ref'], {
          journeys: q.Var('journeys'),
          member_id: q.Var('member_id'),
          member_ref_id: q.Select('id', q.Var('ref')),
        })
      )
    );
    return ret.data;
  }

  async retrieveNextMember({ teamId }) {
    const teamMembers = await this.retrieveTeamMembers({ teamId });
    if (teamMembers.length >= 2) {
      return teamMembers[1];
    }
    if (teamMembers.length == 1) {
      return teamMembers[0];
    }
    return null;
  }

  async incrementMemberJourney(memberRef) {
    const ret = await this.client.query(
      q.Update(q.Ref(q.Collection('Members'), memberRef), {
        data: {
          journeys: q.Add(
            q.Select(
              ['data', 'journeys'],
              q.Get(q.Ref(q.Collection('Members'), memberRef))
            ),
            1
          ),
        },
      })
    );
  }

  async setActiveMember({ teamRefId, memberId }) {
    const ret = await this.client.query(
      q.Update(q.Ref(q.Collection('Teams'), teamRefId), {
        data: { active_member: memberId },
      })
    );
  }
}

module.exports = TeamRotationFauna;
