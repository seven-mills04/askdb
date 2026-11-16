package com.askdb.history;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QueryHistoryRepository extends JpaRepository<QueryHistory, Long> {

    // Spring Data builds the SQL from the method name: newest 30 for this user and connection.
    List<QueryHistory> findTop30ByUserIdAndConnectionIdOrderByCreatedAtDesc(Long userId, Long connectionId);

    void deleteByUserIdAndConnectionId(Long userId, Long connectionId);
}
