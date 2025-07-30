// Handle submission of new shipment
router.post('/new', async (req, res) => {
  try {
    const { date, location, tracking, client, transport = '', courier = '', status = '', description = '' } = req.body;

    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: 'Date, location, tracking, and client are required.'
      });
    }

    const insert = `
      INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await new Promise((resolve, reject) => {
      db.query(insert, [date, location, tracking, client, transport, courier, status, description], err =>
        err ? reject(err) : resolve()
      );
    });

    res.redirect('/shipments');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: `Tracking number "${req.body.tracking}" already exists.`
      });
    }
    console.error('❌ Uncaught error in POST /new:', err);
    return res.status(500).render('form', {
      shipment: req.body,
      action: '/shipments/new',
      error: 'An unexpected error occurred.'
    });
  }
});

// Handle update submission
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;
  const { date, location, tracking, client, transport = '', courier = '', status = '', description = '' } = req.body;

  if (!date || !location || !tracking || !client) {
    return res.status(400).render('form', {
      shipment: req.body,
      action: `/shipments/edit/${id}`,
      error: 'Date, location, tracking, and client are required.'
    });
  }

  const update = `
    UPDATE shipments
    SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?, description = ?
    WHERE id = ?
  `;

  db.query(update, [date, location, tracking, client, transport, courier, status, description, id], err => {
    if (err) {
      console.error('❌ Error updating shipment:', err);
      return res.status(500).render('form', {
        shipment: req.body,
        action: `/shipments/edit/${id}`,
        error: 'Database error.'
      });
    }
    res.redirect('/shipments');
  });
});
