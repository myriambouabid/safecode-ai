package com.safecode.repository;

import com.safecode.entity.FindingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FindingRepository extends JpaRepository<FindingEntity, Long> {

    List<FindingEntity> findByAuditId(Long auditId);

    Optional<FindingEntity> findByAuditIdAndFindingRef(Long auditId, String findingRef);
}
