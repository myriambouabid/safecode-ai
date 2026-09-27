package com.safecode.repository;

import com.safecode.entity.AuditEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditRepository extends JpaRepository<AuditEntity, Long> {
}
