const faunadb = require('faunadb'),
  q = faunadb.query;
const testClient = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

const TeamRotationFauna = require('../index.js');

beforeEach(async (done) => {
  // remove all documents (but not collections)
  try {
    testClient.query(
      q.Foreach(
        q.Paginate(q.Documents(q.Collection('Teams'))),
        q.Lambda('team', q.Delete(q.Var('team')))
      )
    );

    testClient.query(
      q.Foreach(
        q.Paginate(q.Documents(q.Collection('Members'))),
        q.Lambda('member', q.Delete(q.Var('member')))
      )
    );
  } catch (err) {
    console.error('Error deleting documents', err);
  } finally {
    done();
  }
});

test('can add and retrieve a team', async () => {
  const client = new TeamRotationFauna({
    faunaDbSecret: process.env.FAUNADB_SECRET,
  });
  await client.addTeam({
    teamId: '123:abc',
    description: 'This is a team',
  });

  const team = await client.getTeam({ teamId: '123:abc' });
  expect(team.active_member).toEqual('');
  expect(team.description).toEqual('This is a team');
  expect(team.team_ref_id).toBeTruthy();
});

test('can set active user for the team', async () => {
  const client = new TeamRotationFauna({
    faunaDbSecret: process.env.FAUNADB_SECRET,
  });
  await client.addTeam({
    teamId: '123:abc',
    description: 'This is a team',
  });

  let team = await client.getTeam({ teamId: '123:abc' });
  expect(team.active_member).toEqual('');
  expect(team.description).toEqual('This is a team');
  expect(team.team_ref_id).toBeTruthy();

  await client.setActiveMember({ teamRefId: team.team_ref_id, memberId: 'U0EGN6W1G' });

  team = await client.getTeam({ teamId: '123:abc' });
  expect(team.active_member).toEqual('U0EGN6W1G');

});

test('can add and retrieve a member of the team', async () => {
  const client = new TeamRotationFauna({
    faunaDbSecret: process.env.FAUNADB_SECRET,
  });
  await client.addTeamMember({
    name: 'Jane Joe',
    teamId: '123:abc',
    memberId: 'A_U0EGN6W1G',
  });

  await client.addTeamMember({
    name: 'Kelly Joe',
    teamId: '123:abc',
    memberId: 'B_U0EGN6W1G',
  });

  await client.addTeamMember({
    name: 'Zach Joe',
    teamId: '123:abc',
    memberId: 'C_U0EGN6W1G',
  });

  const members = await client.retrieveTeamMembers({ teamId: '123:abc' });

  expect(members[0].member_id).toEqual('A_U0EGN6W1G');
  expect(members[0].journeys).toEqual(0);
  expect(members[0].member_ref_id).toBeTruthy();

  expect(members[1].member_id).toEqual('B_U0EGN6W1G');
  expect(members[1].journeys).toEqual(0);
  expect(members[1].member_ref_id).toBeTruthy();

  expect(members[2].member_id).toEqual('C_U0EGN6W1G');
  expect(members[2].journeys).toEqual(0);
  expect(members[2].member_ref_id).toBeTruthy();
});

test('rotates properly', async () => {
  const client = new TeamRotationFauna({
    faunaDbSecret: process.env.FAUNADB_SECRET,
  });
  await client.addTeamMember({
    name: 'Jane Joe',
    teamId: '123:abc',
    memberId: 'A_U0EGN6W1G',
  });

  await client.addTeamMember({
    name: 'Kelly Joe',
    teamId: '123:abc',
    memberId: 'B_U0EGN6W1G',
  });

  await client.addTeamMember({
    name: 'Zach Joe',
    teamId: '123:abc',
    memberId: 'C_U0EGN6W1G',
  });

  let members = await client.retrieveTeamMembers({ teamId: '123:abc' });
  const jane = members[0].member_ref_id;
  const kelly = members[1].member_ref_id;
  const zach = members[2].member_ref_id;

  let next = await client.retrieveNextMember({ teamId: '123:abc' });
  expect(next.member_id).toEqual('B_U0EGN6W1G');

  await client.incrementMemberJourney(jane);
  members = await client.retrieveTeamMembers({ teamId: '123:abc' });
  expect(members[0].member_id).toEqual('B_U0EGN6W1G');
  expect(members[0].journeys).toEqual(0);

  expect(members[1].member_id).toEqual('C_U0EGN6W1G');
  expect(members[1].journeys).toEqual(0);

  expect(members[2].member_id).toEqual('A_U0EGN6W1G');
  expect(members[2].journeys).toEqual(1);

  next = await client.retrieveNextMember({ teamId: '123:abc' });
  expect(next.member_id).toEqual('C_U0EGN6W1G');

  await client.incrementMemberJourney(kelly);
  members = await client.retrieveTeamMembers({ teamId: '123:abc' });
  expect(members[0].member_id).toEqual('C_U0EGN6W1G');
  expect(members[0].journeys).toEqual(0);

  expect(members[1].member_id).toEqual('A_U0EGN6W1G');
  expect(members[1].journeys).toEqual(1);

  expect(members[2].member_id).toEqual('B_U0EGN6W1G');
  expect(members[2].journeys).toEqual(1);

  next = await client.retrieveNextMember({ teamId: '123:abc' });
  expect(next.member_id).toEqual('A_U0EGN6W1G');

  await client.incrementMemberJourney(zach);
  members = await client.retrieveTeamMembers({ teamId: '123:abc' });
  expect(members[0].member_id).toEqual('A_U0EGN6W1G');
  expect(members[0].journeys).toEqual(1);

  expect(members[1].member_id).toEqual('B_U0EGN6W1G');
  expect(members[1].journeys).toEqual(1);

  expect(members[2].member_id).toEqual('C_U0EGN6W1G');
  expect(members[2].journeys).toEqual(1);
});
