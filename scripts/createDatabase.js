const faunadb = require('faunadb'),
  q = faunadb.query;

const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

(async () => {
  try {
    // create "Teams" collections if it doesn't exist
    const teams = await client.query(q.CreateCollection({ name: 'Teams' }));
  } catch (err) {
    console.log('Teams collection already created?');
  }

  try {
    // create "Members" collections if it doesn't exist
    const members = await client.query(q.CreateCollection({ name: 'Members' }));
  } catch (err) {
    console.log('Members collection already created?');
  }

  try {
    await client.query(
      q.CreateIndex({
        name: 'teams-by-team-id',
        source: q.Collection('Teams'),
        unique: true,
        serialized: true,
        terms: [
          {
            field: ['data', 'team_id'],
          },
        ],
        values: [
          {
            field: ['ref'],
          },
          {
            field: ['data', 'active_member'],
          },
          {
            field: ['data', 'description'],
          },
        ],
      })
    );
  } catch (err) {
    console.log('teams-by-team-id index exists?');
  }

  try {
    await client.query(
      q.CreateIndex({
        name: 'members-sorted-by-journeys',
        source: q.Collection('Members'),
        unique: false,
        serialized: true,
        terms: [
          {
            field: ['data', 'team_id'],
          },
        ],
        values: [
          {
            field: ['data', 'journeys'], // sort by journeys first
          },
          {
            field: ['data', 'member_id'], // then sort by member_id
          },
          {
            field: ['ref'],
          },
        ],
      })
    );
  } catch (err) {
    console.log('members-sorted-by-journeys index exists?');
  }
})();
