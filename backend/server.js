// backend/server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// Helper to fetch full group
async function getFullGroup(id) {
  const groupRes = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
  if (groupRes.rows.length === 0) return null;

  const peopleRes = await pool.query('SELECT * FROM people WHERE group_id = $1', [id]);
  const itemsRes = await pool.query('SELECT * FROM items WHERE group_id = $1', [id]);

  const fullItems = [];
  for (const item of itemsRes.rows) {
    const splitsRes = await pool.query('SELECT person_id FROM item_splits WHERE item_id = $1', [item.id]);
    fullItems.push({ ...item, split_with: splitsRes.rows.map(s => s.person_id) });
  }

  return { ...groupRes.rows[0], people: peopleRes.rows, items: fullItems };
}

// GET /groups (list with counts)
app.get('/groups', async (req, res) => {
  try {
    const query = `
      SELECT g.id, g.name, 
             COUNT(DISTINCT p.id) as people_count, 
             COUNT(DISTINCT i.id) as items_count 
      FROM groups g 
      LEFT JOIN people p ON p.group_id = g.id 
      LEFT JOIN items i ON i.group_id = g.id 
      GROUP BY g.id, g.name
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /groups
app.post('/groups', async (req, res) => {
  const { id, name } = req.body;
  try {
    const { rows } = await pool.query('INSERT INTO groups (id, name) VALUES ($1, $2) RETURNING *', [id, name]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /groups/:id (full details)
app.get('/groups/:id', async (req, res) => {
  try {
    const data = await getFullGroup(req.params.id);
    if (!data) return res.status(404).json({ error: 'Group not found' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /groups/:gid/people
app.post('/groups/:gid/people', async (req, res) => {
  const { id, name } = req.body;
  const gid = req.params.gid;
  try {
    const { rows } = await pool.query('INSERT INTO people (id, name, group_id) VALUES ($1, $2, $3) RETURNING *', [id, name, gid]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /groups/:id
app.delete('/groups/:id', async (req, res) => {
  const groupId = req.params.id;
  try {
    // Start a transaction to delete all related data
    await pool.query('BEGIN');

    // Delete item splits (via cascade or explicitly)
    await pool.query('DELETE FROM item_splits WHERE item_id IN (SELECT id FROM items WHERE group_id = $1)', [groupId]);
    
    // Delete items
    await pool.query('DELETE FROM items WHERE group_id = $1', [groupId]);
    
    // Delete people
    await pool.query('DELETE FROM people WHERE group_id = $1', [groupId]);
    
    // Delete the group
    await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Server error while deleting group' });
  }
});

// DELETE /groups/:gid/people/:pid
app.delete('/groups/:gid/people/:pid', async (req, res) => {
  const gid = req.params.gid;
  const pid = req.params.pid;
  try {
    // Get remaining people
    const remainingRes = await pool.query('SELECT id FROM people WHERE group_id = $1 AND id != $2', [gid, pid]);
    const fallback = remainingRes.rows[0] ? remainingRes.rows[0].id : null;

    // Update paid_by to fallback
    await pool.query('UPDATE items SET paid_by = $1 WHERE group_id = $2 AND paid_by = $3', [fallback, gid, pid]);

    // Remove from splits
    await pool.query('DELETE FROM item_splits WHERE person_id = $1 AND item_id IN (SELECT id FROM items WHERE group_id = $2)', [pid, gid]);

    // Delete items with no paid_by or no splits
    const deleteItemsQuery = `
      DELETE FROM items 
      WHERE group_id = $1 AND (paid_by IS NULL OR 
        (SELECT COUNT(*) FROM item_splits WHERE item_id = items.id) = 0)
    `;
    await pool.query(deleteItemsQuery, [gid]);

    // Delete person
    await pool.query('DELETE FROM people WHERE id = $1', [pid]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /groups/:gid/items
app.post('/groups/:gid/items', async (req, res) => {
  const { id, description, cost, paid_by } = req.body;
  const gid = req.params.gid;
  try {
    // Check if paid_by exists in people
    const personCheck = await pool.query('SELECT id FROM people WHERE group_id = $1 AND id = $2', [gid, paid_by]);
    if (!personCheck.rows.length && paid_by) {
      return res.status(400).json({ error: 'Paid by person ID does not exist in this group.' });
    }

    const itemRes = await pool.query(
      'INSERT INTO items (id, description, cost, paid_by, group_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, description, cost, paid_by || null, gid]
    );

    const peopleRes = await pool.query('SELECT id FROM people WHERE group_id = $1', [gid]);

    for (const person of peopleRes.rows) {
      await pool.query('INSERT INTO item_splits (item_id, person_id) VALUES ($1, $2)', [id, person.id]);
    }

    const fullItem = { ...itemRes.rows[0], split_with: peopleRes.rows.map(p => p.id) };
    console.log(`POST /groups/${gid}/items created item ${id} at ${new Date().toISOString()}`);
    res.json(fullItem);
  } catch (err) {
    console.error(`POST /groups/${gid}/items error:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /groups/:gid/items/:iid
app.delete('/groups/:gid/items/:iid', async (req, res) => {
  const iid = req.params.iid;
  try {
    // Deletes splits via cascade
    await pool.query('DELETE FROM items WHERE id = $1', [iid]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});