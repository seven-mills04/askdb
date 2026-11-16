package com.askdb.connection;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DbConnectionRepository extends JpaRepository<DbConnection, Long> {

    List<DbConnection> findByUserIdOrderByCreatedAtAsc(Long userId);

    // Looking up by id AND owner means one user can never load another user's connection.
    Optional<DbConnection> findByIdAndUserId(Long id, Long userId);
}
