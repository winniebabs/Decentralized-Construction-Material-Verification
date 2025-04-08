;; Quality Testing Contract
;; Records laboratory analysis results

(define-data-var admin principal tx-sender)

;; Test results: 0 = pending, 1 = passed, 2 = failed
(define-map test-results
  { test-id: (string-utf8 36) }
  {
    batch-id: (string-utf8 36),
    lab-principal: principal,
    test-date: uint,
    result: uint,
    parameters: (string-utf8 500)
  }
)

;; Authorized testing labs
(define-map authorized-labs
  { lab-principal: principal }
  {
    name: (string-utf8 100),
    is-active: bool
  }
)

;; Add a testing lab
(define-public (add-testing-lab
    (lab-principal principal)
    (name (string-utf8 100)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (map-set authorized-labs
      { lab-principal: lab-principal }
      {
        name: name,
        is-active: true
      }
    ))
  )
)

;; Deactivate a testing lab
(define-public (deactivate-lab (lab-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (asserts! (is-some (map-get? authorized-labs { lab-principal: lab-principal })) (err u404))
    (ok (map-set authorized-labs
      { lab-principal: lab-principal }
      (merge (unwrap-panic (map-get? authorized-labs { lab-principal: lab-principal }))
             { is-active: false })
    ))
  )
)

;; Record test result
(define-public (record-test-result
    (test-id (string-utf8 36))
    (batch-id (string-utf8 36))
    (result uint)
    (parameters (string-utf8 500)))
  (begin
    (asserts! (is-some (map-get? authorized-labs { lab-principal: tx-sender })) (err u401))
    (asserts! (get is-active (unwrap-panic (map-get? authorized-labs { lab-principal: tx-sender }))) (err u403))
    (asserts! (and (>= result u0) (<= result u2)) (err u400))
    (asserts! (is-none (map-get? test-results { test-id: test-id })) (err u100))
    (ok (map-set test-results
      { test-id: test-id }
      {
        batch-id: batch-id,
        lab-principal: tx-sender,
        test-date: block-height,
        result: result,
        parameters: parameters
      }
    ))
  )
)

;; Get test result
(define-read-only (get-test-result (test-id (string-utf8 36)))
  (map-get? test-results { test-id: test-id })
)

;; Check if batch passed testing
(define-read-only (is-batch-passed (batch-id (string-utf8 36)) (test-id (string-utf8 36)))
  (let ((test-result (map-get? test-results { test-id: test-id })))
    (if (and (is-some test-result)
             (is-eq (get batch-id (unwrap-panic test-result)) batch-id))
      (is-eq (get result (unwrap-panic test-result)) u1)
      false
    )
  )
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
